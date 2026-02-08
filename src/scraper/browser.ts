import { chromium, type Browser } from 'playwright'
import type { Logger } from 'pino'

export async function launchBrowser(logger: Logger): Promise<Browser> {
  logger.info('launching headless browser')
  const browser = await chromium.launch({ headless: true })
  logger.info('browser launched')
  return browser
}

export async function closeBrowser(
  browser: Browser,
  logger: Logger,
): Promise<void> {
  logger.info('closing browser')
  await browser.close()
  logger.info('browser closed')
}
