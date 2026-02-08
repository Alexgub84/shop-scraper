import 'dotenv/config'
import { z } from 'zod'

const configSchema = z.object({
  SCRAPE_URL: z.url(),
  OUTPUT_PATH: z.string().min(1).default('./data/products.json'),
})

export type Config = z.infer<typeof configSchema>

export function loadConfig(): Config {
  const result = configSchema.safeParse({
    SCRAPE_URL: process.env.SCRAPE_URL,
    OUTPUT_PATH: process.env.OUTPUT_PATH,
  })

  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid configuration:\n${errors}`)
  }

  return result.data
}
