import 'dotenv/config'
import { z } from 'zod'

const configSchema = z.object({
  SCRAPE_URL: z.url(),
  OUTPUT_PATH: z.string().min(1).default('./data/products.json'),
  WC_STORE_URL: z.url(),
  WC_CONSUMER_KEY: z.string().min(1),
  WC_CONSUMER_SECRET: z.string().min(1),
})

export type Config = z.infer<typeof configSchema>

export function loadConfig(): Config {
  const result = configSchema.safeParse({
    SCRAPE_URL: process.env.SCRAPE_URL,
    OUTPUT_PATH: process.env.OUTPUT_PATH,
    WC_STORE_URL: process.env.WC_STORE_URL,
    WC_CONSUMER_KEY: process.env.WC_CONSUMER_KEY,
    WC_CONSUMER_SECRET: process.env.WC_CONSUMER_SECRET,
  })

  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid configuration:\n${errors}`)
  }

  return result.data
}
