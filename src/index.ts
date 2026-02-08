import pino from 'pino'
import { loadConfig } from './config.js'
import { launchBrowser, closeBrowser } from './scraper/browser.js'
import { collectProductLinks } from './scraper/link-collector.js'
import { scrapeProduct } from './scraper/product-scraper.js'
import { writeProducts } from './output/writer.js'
import type { Product } from './types/product.js'

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
})

async function main(): Promise<void> {
  const config = loadConfig()
  logger.info({ scrapeUrl: config.SCRAPE_URL }, 'starting scraper')

  const browser = await launchBrowser(logger)

  try {
    const page = await browser.newPage()

    const links = await collectProductLinks(page, config.SCRAPE_URL, logger)
    const totalFound = links.length

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

    await writeProducts(products, totalFound, config.OUTPUT_PATH, logger)

    logger.info(
      {
        totalFound,
        scraped: products.length,
        skipped,
      },
      'scrape complete',
    )
  } finally {
    await closeBrowser(browser, logger)
  }
}

main().catch((error) => {
  logger.fatal({ error }, 'scraper crashed')
  process.exit(1)
})
