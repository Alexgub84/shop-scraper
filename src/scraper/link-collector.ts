import type { Page } from 'playwright'
import type { Logger } from 'pino'
import { CATEGORY_SELECTORS } from './selectors.js'

const MAX_PRODUCTS = 1

export async function collectProductLinks(
  page: Page,
  url: string,
  logger: Logger,
): Promise<string[]> {
  logger.info({ url }, 'navigating to category page')
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 })

  await page.waitForSelector(CATEGORY_SELECTORS.productLink, {
    timeout: 15_000,
  })

  const allLinks = await page.$$eval(
    CATEGORY_SELECTORS.productLink,
    (elements) =>
      elements
        .map((el) => el.getAttribute('href'))
        .filter((href): href is string => href !== null),
  )

  const uniqueLinks = [...new Set(allLinks)]
  const links = uniqueLinks.slice(0, MAX_PRODUCTS)

  logger.info(
    { totalFound: uniqueLinks.length, collected: links.length },
    'collected product links',
  )

  return links
}
