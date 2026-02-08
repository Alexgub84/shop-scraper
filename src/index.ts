import pino from 'pino'
import type { Page } from 'playwright'
import { loadConfig } from './config.js'
import { launchBrowser, closeBrowser } from './scraper/browser.js'
import { collectProductLinks } from './scraper/link-collector.js'
import { scrapeProduct } from './scraper/product-scraper.js'
import { writeProducts } from './output/writer.js'
import { syncProductsToWooCommerce } from './services/woocommerce.js'
import type { Product } from './types/product.js'

const WC_BATCH_SIZE = 10

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
})

function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = []

  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize))
  }

  return batches
}

async function scrapeAllProducts(
  page: Page,
  links: string[],
): Promise<{ products: Product[]; skipped: number }> {
  const products: Product[] = []
  let skipped = 0

  for (const link of links) {
    const product = await scrapeProduct(page, link, logger)
    if (product) {
      products.push(product)
    } else {
      skipped++
    }
  }

  logger.info(
    { total: links.length, scraped: products.length, skipped },
    'scraping complete',
  )

  return { products, skipped }
}

async function syncAllInBatches(
  products: Product[],
  config: ReturnType<typeof loadConfig>,
): Promise<{ created: number; updated: number; failed: number }> {
  const batches = splitIntoBatches(products, WC_BATCH_SIZE)
  let totalCreated = 0
  let totalUpdated = 0
  let totalFailed = 0

  logger.info(
    { totalProducts: products.length, batchCount: batches.length, batchSize: WC_BATCH_SIZE },
    'starting woocommerce sync',
  )

  for (const [index, batch] of batches.entries()) {
    const batchNumber = index + 1
    logger.info({ batch: batchNumber, size: batch.length }, 'syncing batch')

    const result = await syncProductsToWooCommerce(batch, config, logger)
    totalCreated += result.created
    totalUpdated += result.updated
    totalFailed += result.failed

    logger.info(
      {
        batch: batchNumber,
        created: result.created,
        updated: result.updated,
        failed: result.failed,
      },
      'batch synced',
    )
  }

  return { created: totalCreated, updated: totalUpdated, failed: totalFailed }
}

async function main(): Promise<void> {
  const config = loadConfig()
  logger.info({ scrapeUrl: config.SCRAPE_URL }, 'starting scraper')

  const browser = await launchBrowser(logger)

  try {
    const page = await browser.newPage()

    const links = await collectProductLinks(page, config.SCRAPE_URL, logger)

    const { products, skipped } = await scrapeAllProducts(page, links)

    await writeProducts(products, links.length, config.OUTPUT_PATH, logger)

    const wcResult = await syncAllInBatches(products, config)

    logger.info(
      {
        totalFound: links.length,
        scraped: products.length,
        skipped,
        wcCreated: wcResult.created,
        wcUpdated: wcResult.updated,
        wcFailed: wcResult.failed,
      },
      'scrape and sync complete',
    )
  } finally {
    await closeBrowser(browser, logger)
  }
}

main().catch((error) => {
  logger.fatal({ error }, 'scraper crashed')
  process.exit(1)
})
