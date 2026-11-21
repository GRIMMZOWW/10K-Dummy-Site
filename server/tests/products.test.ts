import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { connectDB, disconnectDB } from '../src/db/connect';
import { productListQuerySchema } from '../src/modules/products/product.schema';

const app = createApp();

describe('Products API integration tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('Happy path', () => {
    it('GET /api/health returns { ok: true }', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('GET /api/products returns default pagination with 24 card items and omits description', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(24);
      expect(res.body.total).toBe(10000);
      expect(res.body.totalPages).toBe(417);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items).toHaveLength(24);

      const first = res.body.items[0];
      expect(first).toHaveProperty('sku');
      expect(first).toHaveProperty('slug');
      expect(first).toHaveProperty('title');
      expect(first).toHaveProperty('category');
      expect(typeof first.price).toBe('number');
      expect(Number.isInteger(first.price)).toBe(true);
      expect(first).not.toHaveProperty('description');
      expect(first).not.toHaveProperty('images');
    });

    it('GET /api/products?category=smartphones filters by category', async () => {
      const res = await request(app).get('/api/products?category=smartphones');
      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.items.length).toBeGreaterThan(0);
      for (const item of res.body.items) {
        expect(item.category).toBe('smartphones');
      }
    });

    it('supports sorting by price_asc, price_desc, rating_desc, and newest', async () => {
      const [ascRes, descRes, ratingRes, newestRes] = await Promise.all([
        request(app).get('/api/products?sort=price_asc&limit=10'),
        request(app).get('/api/products?sort=price_desc&limit=10'),
        request(app).get('/api/products?sort=rating_desc&limit=10'),
        request(app).get('/api/products?sort=newest&limit=10'),
      ]);

      expect(ascRes.status).toBe(200);
      expect(descRes.status).toBe(200);
      expect(ratingRes.status).toBe(200);
      expect(newestRes.status).toBe(200);

      const ascPrices = ascRes.body.items.map((p: { price: number }) => p.price);
      for (let i = 1; i < ascPrices.length; i++) {
        expect(ascPrices[i]).toBeGreaterThanOrEqual(ascPrices[i - 1]);
      }

      const descPrices = descRes.body.items.map((p: { price: number }) => p.price);
      for (let i = 1; i < descPrices.length; i++) {
        expect(descPrices[i]).toBeLessThanOrEqual(descPrices[i - 1]);
      }

      const ratings = ratingRes.body.items.map((p: { rating: number }) => p.rating);
      for (let i = 1; i < ratings.length; i++) {
        expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1]);
      }

      const dates = newestRes.body.items.map((p: { createdAt: string }) =>
        new Date(p.createdAt).getTime(),
      );
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
      }
    });

    it('GET /api/products/:slug returns full product details', async () => {
      const listRes = await request(app).get('/api/products?limit=1');
      const slug = listRes.body.items[0].slug as string;

      const detailRes = await request(app).get(`/api/products/${slug}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.slug).toBe(slug);
      expect(typeof detailRes.body.description).toBe('string');
      expect(Array.isArray(detailRes.body.images)).toBe(true);
    });

    it('GET /api/categories returns sorted category counts summing to 10000', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      let totalCount = 0;
      for (let i = 0; i < res.body.length; i++) {
        expect(typeof res.body[i].name).toBe('string');
        expect(typeof res.body[i].count).toBe('number');
        totalCount += res.body[i].count;
        if (i > 0) {
          expect(res.body[i].name.localeCompare(res.body[i - 1].name)).toBeGreaterThan(0);
        }
      }
      expect(totalCount).toBe(10000);
    });
  });

  describe('Edge cases', () => {
    it('returns empty items and total 0 for unmatched search', async () => {
      const res = await request(app).get('/api/products?q=zzzznotaproductxyz123');
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(0);
      expect(res.body.totalPages).toBe(0);
    });

    it('returns remaining 16 items on the last page (page=417)', async () => {
      const res = await request(app).get('/api/products?page=417');
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(417);
      expect(res.body.total).toBe(10000);
      expect(res.body.totalPages).toBe(417);
      expect(res.body.items).toHaveLength(16);
    });

    it('supports 2-char prefix search and 3+ char $text search', async () => {
      const [prefixRes, textRes] = await Promise.all([
        request(app).get('/api/products?q=ip'),
        request(app).get('/api/products?q=phone'),
      ]);

      expect(prefixRes.status).toBe(200);
      expect(prefixRes.body.total).toBeGreaterThan(0);
      for (const item of prefixRes.body.items) {
        expect((item.title as string).toLowerCase().startsWith('ip')).toBe(true);
      }

      expect(textRes.status).toBe(200);
      expect(textRes.body.total).toBeGreaterThan(0);
    });

    it('returns matching peeler products for GET /api/products?q=peeler', async () => {
      const res = await request(app).get('/api/products?q=peeler');
      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.items.length).toBeGreaterThan(0);
      expect((res.body.items[0].title as string).toLowerCase()).toContain('peeler');
    });

    it('filters out-of-stock products when inStock=true', async () => {
      const res = await request(app).get('/api/products?inStock=true&limit=24');
      expect(res.status).toBe(200);
      expect(res.body.total).toBeLessThan(10000);
      expect(res.body.total).toBeGreaterThan(9000);
      for (const item of res.body.items) {
        expect(item.stock).toBeGreaterThan(0);
      }
    });
  });

  describe('Failure and price-unit conversion cases', () => {
    it('converts ?minPrice=10.50 to 1050 minor units and filters accurately', async () => {
      const parsed = productListQuerySchema.parse({ minPrice: '10.50' });
      expect(parsed.minPrice).toBe(1050);

      const res = await request(app).get('/api/products?minPrice=10.50&maxPrice=25.00');
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      for (const item of res.body.items) {
        expect(item.price).toBeGreaterThanOrEqual(1050);
        expect(item.price).toBeLessThanOrEqual(2500);
      }
    });

    it('rejects >2 decimal places (?minPrice=10.999) with 400', async () => {
      const res = await request(app).get('/api/products?minPrice=10.999');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects minPrice > maxPrice (?minPrice=50&maxPrice=10) with 400', async () => {
      const res = await request(app).get('/api/products?minPrice=50&maxPrice=10');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects invalid sort, invalid page, and invalid inStock with 400', async () => {
      const [badSort, badPageZero, badPageText, badInStock] = await Promise.all([
        request(app).get('/api/products?sort=invalid_sort'),
        request(app).get('/api/products?page=0'),
        request(app).get('/api/products?page=abc'),
        request(app).get('/api/products?inStock=false'),
      ]);

      expect(badSort.status).toBe(400);
      expect(badPageZero.status).toBe(400);
      expect(badPageText.status).toBe(400);
      expect(badInStock.status).toBe(400);
    });

    it('returns 404 for an unknown product slug', async () => {
      const res = await request(app).get('/api/products/nonexistent-slug-999999');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });
});
