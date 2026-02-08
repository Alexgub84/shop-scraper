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

## Implementation Progress

Tracked via [GitHub Issues](https://github.com/Alexgub84/shop-scraper/issues).

### Phase 1 — Local JSON scraper (`phase-1` label)

| # | Issue | Status |
|---|-------|--------|
| 1 | [Create config module](https://github.com/Alexgub84/shop-scraper/issues/1) | open |
| 2 | [Create types & Zod schema](https://github.com/Alexgub84/shop-scraper/issues/2) | open |
| 3 | [Create CSS selectors module](https://github.com/Alexgub84/shop-scraper/issues/3) | open |
| 4 | [Create browser lifecycle module](https://github.com/Alexgub84/shop-scraper/issues/4) | open |
| 5 | [Create link collector](https://github.com/Alexgub84/shop-scraper/issues/5) | open |
| 6 | [Create product scraper](https://github.com/Alexgub84/shop-scraper/issues/6) | open |
| 7 | [Create JSON writer](https://github.com/Alexgub84/shop-scraper/issues/7) | open |
| 8 | [Create entry point (orchestrator)](https://github.com/Alexgub84/shop-scraper/issues/8) | open |
| 9 | [Validation: build, lint, e2e test](https://github.com/Alexgub84/shop-scraper/issues/9) | open |

### Phase 2 — Database persistence (`phase-2` label)

| # | Issue | Status |
|---|-------|--------|
| 10 | [Add DB dependencies](https://github.com/Alexgub84/shop-scraper/issues/10) | open |
| 11 | [Create DB schema & client](https://github.com/Alexgub84/shop-scraper/issues/11) | open |
| 12 | [Create product service (DB upsert)](https://github.com/Alexgub84/shop-scraper/issues/12) | open |
| 13 | [Update entry point to write to DB](https://github.com/Alexgub84/shop-scraper/issues/13) | open |
