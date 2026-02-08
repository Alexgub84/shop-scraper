import type { Page } from 'playwright'
import type { Logger } from 'pino'
import { ProductSchema, type Product } from '../types/product.js'
import { PRODUCT_SELECTORS } from './selectors.js'

const BASE_URL = 'https://www.mi-il.co.il'

function resolveImageUrl(src: string): string {
  if (src.startsWith('http')) return src
  return `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`
}

export async function scrapeProduct(
  page: Page,
  productUrl: string,
  logger: Logger,
): Promise<Product | null> {
  logger.info({ productUrl }, 'scraping product page')

  try {
    await page.goto(productUrl, { waitUntil: 'networkidle', timeout: 45_000 })

    await page.waitForSelector(PRODUCT_SELECTORS.name, { timeout: 15_000 })

    const name = await page
      .$eval(PRODUCT_SELECTORS.name, (el) => el.textContent?.trim() ?? '')
      .catch(() => '')

    const price = await page
      .$eval(PRODUCT_SELECTORS.price, (el) => el.textContent?.trim() ?? '')
      .catch(() => '')

    const description = await page
      .$$eval(PRODUCT_SELECTORS.description, (elements) =>
        elements
          .map((el) => el.textContent?.trim())
          .filter(Boolean)
          .join('\n'),
      )
      .catch(() => '')

    const catalogNumber = await page
      .$eval(PRODUCT_SELECTORS.catalogNumber, (el) => el.textContent?.trim() ?? '')
      .catch(() => '')

    const rawImageSrc = await page
      .$eval(PRODUCT_SELECTORS.image, (el) => el.getAttribute('src') ?? '')
      .catch(() => '')

    const imageUrl = rawImageSrc ? resolveImageUrl(rawImageSrc) : ''

    const raw = {
      catalogNumber,
      name,
      description,
      price,
      imageUrl,
      productUrl,
      scrapedAt: new Date().toISOString(),
    }

    const result = ProductSchema.safeParse(raw)

    if (!result.success) {
      const errors = result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', ')
      logger.warn({ productUrl, errors }, 'product validation failed')
      return null
    }

    logger.info({ name: result.data.name }, 'product scraped')
    return result.data
  } catch (error) {
    logger.error({ productUrl, error }, 'failed to scrape product page')
    return null
  }
}
