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
  images: { src: string }[]
}

interface SyncResult {
  created: number
  updated: number
  failed: number
  errors: { sku: string; message: string }[]
}

function extractSku(productUrl: string): string {
  const slug = new URL(productUrl).pathname.split('/').filter(Boolean).pop()
  return slug ?? 'unknown'
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
    sku: extractSku(product.productUrl),
    description: product.description,
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
): Promise<number | null> {
  const searchUrl = `${apiUrl}?sku=${encodeURIComponent(sku)}`
  const response = await fetch(searchUrl, {
    headers: { Authorization: auth },
  })

  if (!response.ok) return null

  const products = (await response.json()) as { id: number }[]
  return products.length > 0 ? products[0].id : null
}

async function upsertProduct(
  wcProduct: WcProduct,
  apiUrl: string,
  auth: string,
  logger: Logger,
): Promise<'created' | 'updated' | 'failed'> {
  const existingId = await findExistingProduct(wcProduct.sku, apiUrl, auth)

  const url = existingId ? `${apiUrl}/${existingId}` : apiUrl
  const method = existingId ? 'PUT' : 'POST'

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
    },
    body: JSON.stringify(wcProduct),
  })

  if (response.ok) {
    const action = existingId ? 'updated' : 'created'
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
  const result: SyncResult = { created: 0, updated: 0, failed: 0, errors: [] }

  for (const product of products) {
    const wcProduct = toWcProduct(product)

    try {
      const action = await upsertProduct(wcProduct, config.WC_API_URL, auth, logger)
      if (action === 'created') result.created++
      else if (action === 'updated') result.updated++
      else {
        result.failed++
        result.errors.push({ sku: wcProduct.sku, message: 'upsert failed' })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(
        { sku: wcProduct.sku, error: message },
        'failed to sync product',
      )
      result.failed++
      result.errors.push({ sku: wcProduct.sku, message })
    }
  }

  logger.info(
    { created: result.created, updated: result.updated, failed: result.failed },
    'woocommerce sync complete',
  )

  return result
}
