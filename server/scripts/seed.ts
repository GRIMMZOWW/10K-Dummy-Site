import fs from 'node:fs/promises';
import path from 'node:path';
import { CURRENCY } from '../src/config/env';
import { connectDB, disconnectDB } from '../src/db/connect';
import { ProductModel, type Product } from '../src/models/product.model';

const DUMMYJSON_URL = 'https://dummyjson.com/products?limit=0';
const CACHE_PATH = path.resolve(__dirname, 'dummyjson.cache.json');
const TARGET_COUNT = 10_000;
const BATCH_SIZE = 1_000;
const FIXED_SEED = 20260401;
const BASE_CREATED_AT_MS = Date.UTC(2026, 0, 1, 0, 0, 0);
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const VARIANT_WORDS = [
  'Pro',
  'Mini',
  'Max',
  'Lite',
  'Plus',
  'Ultra',
  'Classic',
  'Studio',
  'Midnight Black',
  'Silver',
  'Ocean Blue',
  'Forest Green',
  'Rose Gold',
  'Amber',
  'Limited Edition',
  'Collector Edition',
  'Signature Edition',
  'Essential',
  'Select',
  'Prime',
] as const;

interface DummyJsonProduct {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage?: number;
  rating: number;
  stock?: number;
  tags?: string[];
  brand?: string;
  thumbnail: string;
  images?: string[];
}

interface DummyJsonResponse {
  products: DummyJsonProduct[];
  total: number;
  skip: number;
  limit: number;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function categoryCode(category: string): string {
  const cleaned = category.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return (cleaned + 'XXX').slice(0, 3);
}

async function loadBaseProducts(): Promise<DummyJsonProduct[]> {
  try {
    const cachedRaw = await fs.readFile(CACHE_PATH, 'utf8');
    const cached = JSON.parse(cachedRaw) as DummyJsonResponse;
    if (Array.isArray(cached.products) && cached.products.length > 0) {
      console.log(`Loaded ${cached.products.length} base products from cache: ${CACHE_PATH}`);
      return cached.products;
    }
  } catch {
    // Cache does not exist or is invalid; fetch from DummyJSON below.
  }

  console.log(`Fetching base products from ${DUMMYJSON_URL}...`);
  const response = await fetch(DUMMYJSON_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch DummyJSON products: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as DummyJsonResponse;
  if (!Array.isArray(data.products) || data.products.length === 0) {
    throw new Error('DummyJSON response contained no products');
  }

  await fs.writeFile(CACHE_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Cached ${data.products.length} base products to ${CACHE_PATH}`);
  return data.products;
}

function expandProducts(baseProducts: DummyJsonProduct[]): Product[] {
  const rand = mulberry32(FIXED_SEED);
  const baseCount = baseProducts.length;
  const baseCopies = Math.floor(TARGET_COUNT / baseCount);
  const remainder = TARGET_COUNT % baseCount;

  const generated: Product[] = [];
  const usedSkus = new Set<string>();
  const usedSlugs = new Set<string>();

  for (let i = 0; i < baseCount; i++) {
    const base = baseProducts[i];
    const copies = baseCopies + (i < remainder ? 1 : 0);
    const cat3 = categoryCode(base.category);
    const baseId4 = String(base.id).padStart(4, '0');

    for (let copyNum = 1; copyNum <= copies; copyNum++) {
      const copy4 = String(copyNum).padStart(4, '0');
      const sku = `${cat3}-${baseId4}-${copy4}`;
      if (usedSkus.has(sku)) {
        throw new Error(`Duplicate SKU generated: ${sku}`);
      }
      usedSkus.add(sku);

      const variant = VARIANT_WORDS[Math.floor(rand() * VARIANT_WORDS.length)];
      const title = `${base.title.trim()} ${variant}`;
      const titleLower = title.toLowerCase();

      let slug = `${slugify(title)}-${copy4}`;
      if (usedSlugs.has(slug)) {
        slug = `${slugify(title)}-${baseId4}-${copy4}`;
      }
      if (usedSlugs.has(slug)) {
        throw new Error(`Duplicate slug generated: ${slug}`);
      }
      usedSlugs.add(slug);

      const sign = rand() < 0.5 ? -1 : 1;
      const pctShift = 0.05 + rand() * 0.35; // 5% to 40%
      const adjustedMajor = base.price * (1 + sign * pctShift);
      const price = Math.max(1, Math.round(adjustedMajor * CURRENCY.minorUnitFactor));

      const isOutOfStock = rand() < 0.08;
      const stock = isOutOfStock ? 0 : Math.floor(rand() * 500) + 1;

      const ratingShift = rand() - 0.5;
      const rating = Number(Math.min(5, Math.max(1, base.rating + ratingShift)).toFixed(2));

      const discountPercentage =
        typeof base.discountPercentage === 'number'
          ? Number(Math.max(0, base.discountPercentage).toFixed(2))
          : 0;

      const createdAt = new Date(BASE_CREATED_AT_MS - Math.floor(rand() * ONE_YEAR_MS));

      generated.push({
        sku,
        slug,
        title,
        titleLower,
        description: base.description,
        brand: base.brand?.trim() || undefined,
        category: base.category.trim(),
        tags: Array.isArray(base.tags) ? base.tags : [],
        price,
        discountPercentage,
        stock,
        rating,
        thumbnail: base.thumbnail,
        images: Array.isArray(base.images) ? base.images : [],
        createdAt,
      });
    }
  }

  return generated;
}

function printSummary(products: Product[]): void {
  const categoryCounts = new Map<string, number>();
  let minPrice = Number.POSITIVE_INFINITY;
  let maxPrice = Number.NEGATIVE_INFINITY;
  let zeroStockCount = 0;

  for (const product of products) {
    categoryCounts.set(product.category, (categoryCounts.get(product.category) ?? 0) + 1);
    if (product.price < minPrice) minPrice = product.price;
    if (product.price > maxPrice) maxPrice = product.price;
    if (product.stock === 0) zeroStockCount++;
  }

  console.log('\n=== Seed Summary ===');
  console.log(`Total products: ${products.length}`);
  console.log(
    `Out-of-stock (stock=0): ${zeroStockCount} (${((zeroStockCount / products.length) * 100).toFixed(2)}%)`,
  );
  console.log(
    `Min price: ${minPrice} minor units (${(minPrice / CURRENCY.minorUnitFactor).toFixed(2)} ${CURRENCY.code})`,
  );
  console.log(
    `Max price: ${maxPrice} minor units (${(maxPrice / CURRENCY.minorUnitFactor).toFixed(2)} ${CURRENCY.code})`,
  );
  console.log(`First 3 SKUs: ${products.slice(0, 3).map((p) => p.sku).join(', ')}`);
  console.log('Per-category counts:');

  const sortedCategories = [...categoryCounts.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [category, count] of sortedCategories) {
    console.log(`  - ${category}: ${count}`);
  }
}

async function main(): Promise<void> {
  const baseProducts = await loadBaseProducts();
  const products = expandProducts(baseProducts);

  if (products.length !== TARGET_COUNT) {
    throw new Error(`Expected ${TARGET_COUNT} products, generated ${products.length}`);
  }

  await connectDB();

  try {
    console.log('Wiping existing products collection...');
    await ProductModel.deleteMany({});

    console.log(`Inserting ${products.length} products in batches of ${BATCH_SIZE}...`);
    for (let offset = 0; offset < products.length; offset += BATCH_SIZE) {
      const batch = products.slice(offset, offset + BATCH_SIZE);
      await ProductModel.insertMany(batch, { ordered: true });
    }

    console.log('Building/syncing product indexes...');
    await ProductModel.syncIndexes();

    printSummary(products);
  } finally {
    await disconnectDB();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
