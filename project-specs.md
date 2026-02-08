# Shop Scraper — Project Specs

## Overview

Node.js TypeScript scraper for [hemilton.co.il/category/tv](https://www.hemilton.co.il/category/tv).
Extracts product data (name, description, price, image) and saves to SQLite.

## Target Site Analysis

- **Category page:** `hemilton.co.il/category/tv` — 16 products, single page, no pagination
- **Product detail pages:** `mi-il.co.il/product/...` (different domain)
- **No REST API, no JSON-LD product data, blocks non-browser HTTP clients**
- **Scraping method:** Playwright (headless browser) — only viable approach
- **Images:** jQuery lazy loading — use `data-original` attribute, prepend base URL for relative paths
- **All data scraped from product detail pages** — category page only used to collect product links

## Constraints

- **Product limit:** 10 products per run (first 10 links from category page)

## CSS Selectors

### Category Page (link collection only)

| Data         | Selector               |
| ------------ | ---------------------- |
| Product card | `.product.tpurl`       |
| Link         | `a.product.tpurl[href]`|

### Product Detail Page (all data)

| Data        | Selector               |
| ----------- | ---------------------- |
| Name        | `h1.product-title-h2`  |
| Price       | `.single-price .price` |
| Description | `.desc-abv p`          |
| Image       | `.single-gallery img`  |

## Stack

### Phase 1 (current) — Local JSON output

| Layer      | Package                      |
| ---------- | ---------------------------- |
| Scraping   | `playwright`                 |
| Validation | `zod`                        |
| Config     | `dotenv`                     |
| Logger     | `pino`                       |
| Dev/Types  | `typescript`, `tsx`          |

### Phase 2 (later) — Database persistence

| Layer      | Package                              |
| ---------- | ------------------------------------ |
| Database   | `better-sqlite3`                     |
| ORM        | `drizzle-orm` + `drizzle-kit`        |
| Dev/Types  | `@types/better-sqlite3`              |

All dependency versions pinned exactly (no `^` or `~`).

## Project Structure

### Phase 1 (current)

```
src/
├── index.ts                    # Entry point — orchestrates scrape + save
├── config.ts                   # Loads & validates env vars
├── types/
│   └── product.ts              # Product interface + Zod schema
├── scraper/
│   ├── browser.ts              # Playwright browser lifecycle
│   ├── link-collector.ts       # Collect product links from category page
│   ├── product-scraper.ts      # Scrape all data from a single product page
│   └── selectors.ts            # CSS selectors (easy to update per-site)
└── output/
    └── writer.ts               # Write validated products to JSON file
```

Output saved to `data/products.json`.

### Phase 2 (later) — adds DB layer

```
src/
├── db/
│   ├── client.ts               # Drizzle + better-sqlite3 setup
│   ├── schema.ts               # Drizzle table definition (products)
│   └── migrate.ts              # Auto-create tables on first run
└── services/
    └── product-service.ts      # Validate + upsert products to DB
```

## JSON Output Shape (`data/products.json`)

```json
{
  "scrapedAt": "2026-02-07T12:00:00.000Z",
  "totalFound": 16,
  "totalScraped": 10,
  "products": [
    {
      "name": "...",
      "description": "...",
      "price": "...",
      "imageUrl": "...",
      "productUrl": "...",
      "scrapedAt": "2026-02-07T12:00:00.000Z"
    }
  ]
}
```

## Database Schema — Phase 2 (`products` table)

| Column      | Type         | Notes                                       |
| ----------- | ------------ | ------------------------------------------- |
| id          | INTEGER PK   | Auto-increment                              |
| external_id | TEXT UNIQUE  | Product URL slug (used for upsert)          |
| name        | TEXT NOT NULL | Product name                                |
| description | TEXT         | From product detail page                    |
| price       | TEXT NOT NULL | Price string (preserves currency symbol)    |
| image_url   | TEXT         | Absolute URL to product image               |
| scraped_at  | TEXT NOT NULL | ISO timestamp of scrape                     |

## Environment Variables

```
SCRAPE_URL=https://www.hemilton.co.il/category/tv
OUTPUT_PATH=./data/products.json
```

## Execution Flow

1. Load & validate config (`SCRAPE_URL`, `OUTPUT_PATH`)
2. Launch Playwright browser (headless)
3. Navigate to `SCRAPE_URL` (category page)
4. Collect all product links from `.product.tpurl` elements
5. Take first 10 links only
6. For each product link:
   a. Navigate to product detail page
   b. Extract name, price, description, image
   c. Validate through Zod schema
7. Write all valid products to `OUTPUT_PATH` as JSON
8. Log summary (total found, scraped, valid, skipped)
9. Close browser

## Implementation Checklist

### Phase 1 — Local JSON scraper

- [ ] 1. Initialize project (package.json, tsconfig, eslint, prettier)
- [ ] 2. Create config module (`src/config.ts`, `.env`, `.env.example`)
- [ ] 3. Create types & Zod schema (`src/types/product.ts`)
- [ ] 4. Create selectors (`src/scraper/selectors.ts`)
- [ ] 5. Create browser lifecycle (`src/scraper/browser.ts`)
- [ ] 6. Create link collector (`src/scraper/link-collector.ts`)
- [ ] 7. Create product scraper (`src/scraper/product-scraper.ts`)
- [ ] 8. Create JSON writer (`src/output/writer.ts`)
- [ ] 9. Create entry point (`src/index.ts`)
- [ ] 10. Run validation (build, lint) and end-to-end test

### Phase 2 — Database persistence (later)

- [ ] 11. Add DB dependencies (better-sqlite3, drizzle-orm)
- [ ] 12. Create DB schema & client (`src/db/`)
- [ ] 13. Create product service (`src/services/product-service.ts`)
- [ ] 14. Update entry point to write to DB instead of JSON
