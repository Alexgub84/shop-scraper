export const CATEGORY_SELECTORS = {
  productLink: 'a.product.tpurl',
  loadMoreButton: 'button:has-text("טעינת מוצרים נוספים")',
} as const

export const PRODUCT_SELECTORS = {
  name: 'h1.product-title-h2',
  price: '.single-price .price',
  description: '.desc-abv p',
  image: '.single-gallery li.lslide img',
  catalogNumber: '#product-barcode',
} as const
