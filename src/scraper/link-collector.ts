import type { Page } from 'playwright'
import type { Logger } from 'pino'
import { CATEGORY_SELECTORS } from './selectors.js'

async function clickLoadMoreUntilDone(
  page: Page,
  logger: Logger,
): Promise<void> {
  let round = 0

  while (true) {
    const button = page.locator(CATEGORY_SELECTORS.loadMoreButton)
    const isVisible = await button.isVisible().catch(() => false)

    if (!isVisible) {
      logger.info({ rounds: round }, 'no more products to load')
      break
    }

    const prevCount = await page.$$eval(
      CATEGORY_SELECTORS.productLink,
      (els) => els.length,
    )

    await button.click()
    round++

    try {
      await page.waitForFunction(
        (prev: number) =>
          document.querySelectorAll('a.product.tpurl').length > prev,
        prevCount,
        { timeout: 10_000 },
      )
      await page.waitForLoadState('networkidle').catch(() => {})
    } catch {
      logger.info({ rounds: round }, 'no new products after click')
      break
    }

    const newCount = await page.$$eval(
      CATEGORY_SELECTORS.productLink,
      (els) => els.length,
    )
    logger.info(
      { round, productsLoaded: newCount },
      'loaded more products',
    )
  }
}

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

  await clickLoadMoreUntilDone(page, logger)

  const allLinks = await page.$$eval(
    CATEGORY_SELECTORS.productLink,
    (elements) =>
      elements
        .map((el) => el.getAttribute('href'))
        .filter((href): href is string => href !== null),
  )

  const links = [...new Set(allLinks)]

  logger.info({ totalFound: links.length }, 'collected all product links')

  return links
}
