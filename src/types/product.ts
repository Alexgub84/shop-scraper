import { z } from 'zod'

export const ProductSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.string().min(1),
  imageUrl: z.string().url(),
  productUrl: z.string().url(),
  scrapedAt: z.string().datetime(),
})

export type Product = z.infer<typeof ProductSchema>

export const ScrapeResultSchema = z.object({
  scrapedAt: z.string().datetime(),
  totalFound: z.number().int().nonnegative(),
  totalScraped: z.number().int().nonnegative(),
  products: z.array(ProductSchema),
})

export type ScrapeResult = z.infer<typeof ScrapeResultSchema>
