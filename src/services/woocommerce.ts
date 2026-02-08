import type { Logger } from 'pino'
import type { Product } from '../types/product.js'
import type { Config } from '../config.js'

interface WcProduct {
  name: string
  type: 'simple'
  status: 'publish'
  regular_price: string
  sku: string
  description: string
  manage_stock: boolean
  stock_quantity: number
  images: { src: string }[]
}

interface SyncResult {
  created: number
  updated: number
  failed: number
  errors: { catalogNumber: string; message: string }[]
}

function parsePrice(priceStr: string): string {
  return priceStr.replace(/[^\d.]/g, '')
}

function toWcProduct(product: Product): WcProduct {
  return {
    name: product.name,
    type: 'simple',
    status: 'publish',
    regular_price: parsePrice(product.price),
    sku: product.catalogNumber,
    description: product.description,
    manage_stock: true,
    stock_quantity: 10,
    images: product.imageUrl ? [{ src: product.imageUrl }] : [],
  }
}

function buildAuthHeader(key: string, secret: string): string {
  const credentials = Buffer.from(`${key}:${secret}`).toString('base64')
  return `Basic ${credentials}`
}

async function findExistingProduct(
  sku: string,
  apiUrl: string,
  auth: string,
): Promise<{ id: number; trashed: boolean } | null> {
  for (const status of ['any', 'trash']) {
    const searchUrl = `${apiUrl}?sku=${encodeURIComponent(sku)}&status=${status}`
    const response = await fetch(searchUrl, {
      headers: { Authorization: auth },
    })

    if (!response.ok) continue

    const products = (await response.json()) as { id: number; status: string }[]
    if (products.length > 0) {
      return { id: products[0].id, trashed: products[0].status === 'trash' }
    }
  }

  return null
}

async function deleteTrashedProduct(
  productId: number,
  apiUrl: string,
  auth: string,
): Promise<void> {
  await fetch(`${apiUrl}/${productId}?force=true`, {
    method: 'DELETE',
    headers: { Authorization: auth },
  })
}

async function upsertProduct(
  wcProduct: WcProduct,
  apiUrl: string,
  auth: string,
  logger: Logger,
): Promise<'created' | 'updated' | 'failed'> {
  const existing = await findExistingProduct(wcProduct.sku, apiUrl, auth)

  if (existing?.trashed) {
    logger.info({ sku: wcProduct.sku }, 'removing trashed product before re-creating')
    await deleteTrashedProduct(existing.id, apiUrl, auth)
  }

  const activeId = existing && !existing.trashed ? existing.id : null
  const url = activeId ? `${apiUrl}/${activeId}` : apiUrl
  const method = activeId ? 'PUT' : 'POST'

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
    },
    body: JSON.stringify(wcProduct),
  })

  if (response.ok) {
    const action = activeId ? 'updated' : 'created'
    logger.info(
      { sku: wcProduct.sku, name: wcProduct.name, action },
      `product ${action} in woocommerce`,
    )
    return action
  }

  const body = await response.text()
  const isImageError = body.includes('image_upload_error')

  if (isImageError && wcProduct.images.length > 0) {
    logger.warn(
      { sku: wcProduct.sku },
      'image upload failed, retrying without images',
    )
    const withoutImages = { ...wcProduct, images: [] }
    return upsertProduct(withoutImages, apiUrl, auth, logger)
  }

  logger.warn(
    { sku: wcProduct.sku, status: response.status, body },
    'woocommerce API error',
  )
  return 'failed'
}

export async function syncProductsToWooCommerce(
  products: Product[],
  config: Config,
  logger: Logger,
): Promise<SyncResult> {
  const auth = buildAuthHeader(config.WC_CONSUMER_KEY, config.WC_CONSUMER_SECRET)
  const productsUrl = `${config.WC_STORE_URL}/wp-json/wc/v3/products`
  const result: SyncResult = { created: 0, updated: 0, failed: 0, errors: [] }

  for (const product of products) {
    const wcProduct = toWcProduct(product)
    const catalogNumber = product.catalogNumber

    try {
      const action = await upsertProduct(wcProduct, productsUrl, auth, logger)
      if (action === 'created') result.created++
      else if (action === 'updated') result.updated++
      else {
        result.failed++
        result.errors.push({ catalogNumber, message: 'upsert failed' })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(
        { catalogNumber, error: message },
        'failed to sync product',
      )
      result.failed++
      result.errors.push({ catalogNumber, message })
    }
  }

  logger.info(
    { created: result.created, updated: result.updated, failed: result.failed },
    'woocommerce sync complete',
  )

  return result
}
