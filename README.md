# Shop Scraper

Product scraper that extracts catalog data from a target e-commerce site and syncs it to a WooCommerce store. Collects product name, description, price, catalog number, and image for each product.

## Prerequisites

- Node.js 20+
- A WooCommerce store with REST API credentials ([how to generate](https://woocommerce.com/document/woocommerce-rest-api/))

## Setup

1. Install dependencies:

```bash
npm install
```

2. Install Playwright browsers:

```bash
npx playwright install chromium
```

3. Create a `.env` file from the example:

```bash
cp .env.example .env
```

4. Fill in the environment variables:

| Variable             | Description                                  | Default                  |
| -------------------- | -------------------------------------------- | ------------------------ |
| `SCRAPE_URL`         | Category page URL to scrape products from    | _(required)_             |
| `OUTPUT_PATH`        | Path for the JSON output file                | `./data/products.json`   |
| `WC_STORE_URL`       | WooCommerce store URL (e.g. `https://shop.example.com`) | _(required)_ |
| `WC_CONSUMER_KEY`    | WooCommerce REST API consumer key            | _(required)_             |
| `WC_CONSUMER_SECRET` | WooCommerce REST API consumer secret         | _(required)_             |

## Usage

Run the scraper:

```bash
npm run dev
```

## Scripts

| Script            | Description                     |
| ----------------- | ------------------------------- |
| `npm run dev`     | Run the scraper                 |
| `npm run build`   | Compile TypeScript to `dist/`   |
| `npm run typecheck` | Type-check without emitting   |
| `npm run lint`    | Run ESLint                      |
| `npm run lint:fix`| Auto-fix lint errors            |
| `npm run format`  | Format with Prettier            |
| `npm run format:check` | Check formatting           |

## How It Works

1. **Launch browser** -- starts a headless Chromium instance via Playwright
2. **Collect product links** -- navigates to the category page, clicks "load more" until all products are visible, then extracts unique product URLs
3. **Scrape each product** -- visits every product page and extracts name, price, description, catalog number, and image URL. Each product is validated with Zod before being included
4. **Save to JSON** -- writes the full scrape result (with metadata) to the configured output path
5. **Sync to WooCommerce** -- upserts each product to WooCommerce via the REST API in batches of 10. Products are matched by SKU (catalog number). If an image upload fails, the product is retried without the image

## Project Structure

```
src/
├── index.ts                  # Entry point and orchestration
├── config.ts                 # Zod-validated environment config
├── types/
│   └── product.ts            # Product and ScrapeResult schemas
├── scraper/
│   ├── browser.ts            # Playwright browser lifecycle
│   ├── selectors.ts          # CSS selectors for the target site
│   ├── link-collector.ts     # Category page crawler
│   └── product-scraper.ts    # Individual product page scraper
├── output/
│   └── writer.ts             # JSON file writer
└── services/
    └── woocommerce.ts        # WooCommerce REST API sync
```

## Output Format

The scraper writes a JSON file with the following structure:

```json
{
  "scrapedAt": "2026-02-08T12:00:00.000Z",
  "totalFound": 42,
  "totalScraped": 40,
  "products": [
    {
      "catalogNumber": "ABC-123",
      "name": "Product Name",
      "description": "Product description text",
      "price": "₪99.90",
      "imageUrl": "https://example.com/image.jpg",
      "productUrl": "https://example.com/product/abc-123",
      "scrapedAt": "2026-02-08T12:00:00.000Z"
    }
  ]
}
```
