import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Logger } from 'pino'
import type { Product, ScrapeResult } from '../types/product.js'

export async function writeProducts(
  products: Product[],
  totalFound: number,
  outputPath: string,
  logger: Logger,
): Promise<void> {
  const result: ScrapeResult = {
    scrapedAt: new Date().toISOString(),
    totalFound,
    totalScraped: products.length,
    products,
  }

  const dir = dirname(outputPath)
  await mkdir(dir, { recursive: true })

  const json = JSON.stringify(result, null, 2)
  await writeFile(outputPath, json, 'utf-8')

  logger.info(
    { outputPath, productCount: products.length },
    'products written to file',
  )
}
