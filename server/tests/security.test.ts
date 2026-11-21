import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { connectDB, disconnectDB } from '../src/db/connect';

const app = createApp();

describe('Security penetration & hostile-input tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('1. NoSQL operator & prototype injection', () => {
    it.each([
      '/api/products?category[$ne]=beauty',
      '/api/products?q[$gt]=',
      '/api/products?minPrice[$ne]=0',
      '/api/products?sort[$where]=1',
      '/api/products?__proto__[polluted]=1',
    ])('rejects %s with HTTP 400', async (url) => {
      const res = await request(app).get(url);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
  });

  describe('2. Regex injection & $text fuzzing', () => {
    it.each(['[[', '.*', '\\', '(a', '$^'])('safely handles 1-2 char regex metacharacters: %s', async (q) => {
      const res = await request(app).get(`/api/products?q=${encodeURIComponent(q)}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('rejects null-byte search query (%00) with 400 and never 500', async () => {
      const res = await request(app).get('/api/products?q=%00');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it.each(['---', '"""', '+++', '   '])('safely handles 3+ char punctuation/whitespace: %s', async (q) => {
      const res = await request(app).get(`/api/products?q=${encodeURIComponent(q)}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('rejects oversized q (>100 chars) with 400', async () => {
      const res = await request(app).get(`/api/products?q=${'a'.repeat(101)}`);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('3. Numeric overflow, boundary & pagination abuse', () => {
    it.each([
      '/api/products?page=0',
      '/api/products?page=-1',
      '/api/products?page=NaN',
      '/api/products?page=Infinity',
      '/api/products?page=999999999',
      '/api/products?limit=0',
      '/api/products?limit=101',
      '/api/products?minPrice=-5',
      '/api/products?minPrice=10.999',
      '/api/products?minPrice=1e30',
      '/api/products?minPrice=500&maxPrice=10',
      '/api/products?inStock=false',
      '/api/products?inStock=1',
    ])('rejects invalid numeric/boundary query %s with 400', async (url) => {
      const res = await request(app).get(url);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 200 with empty items on valid deep pagination (?page=999999)', async () => {
      const res = await request(app).get('/api/products?page=999999');
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.page).toBe(999999);
    });
  });

  describe('4. Slug path traversal & fuzzing', () => {
    it.each([
      '/api/products/$ne',
      '/api/products/..%2F..%2Fetc%2Fpasswd',
      '/api/products/%00',
      '/api/products/%3Cscript%3Ealert(1)%3C%2Fscript%3E',
      `/api/products/${'x'.repeat(500)}`,
    ])('returns clean 400/404 JSON without stack trace for %s', async (url) => {
      const res = await request(app).get(url);
      expect([400, 404]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
      expect(res.body).not.toHaveProperty('stack');
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toMatch(/\\n\s+at\s+/);
      expect(serialized).not.toContain('node_modules');
      expect(serialized).not.toContain('C:\\');
    });
  });

  describe('5. HTTP verb abuse & security headers', () => {
    it.each([
      ['post', '/api/products'],
      ['put', '/api/products'],
      ['patch', '/api/products'],
      ['delete', '/api/products'],
      ['post', '/api/categories'],
      ['put', '/api/categories'],
      ['patch', '/api/categories'],
      ['delete', '/api/categories'],
    ] as const)('rejects %s %s with 404/405 JSON', async (method, path) => {
      const res = await request(app)[method](path);
      expect([404, 405]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });

    it('sets helmet headers and strips X-Powered-By', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('6. Data integrity invariants', () => {
    it('omits description/images on list responses and enforces non-negative integer prices', async () => {
      const res = await request(app).get('/api/products?limit=50');
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(50);

      for (const item of res.body.items) {
        expect(item).not.toHaveProperty('description');
        expect(item).not.toHaveProperty('images');
        expect(Number.isInteger(item.price)).toBe(true);
        expect(item.price).toBeGreaterThanOrEqual(0);
      }
    });

    it('returns non-empty unique categories summing to 10,000', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      const names = new Set<string>();
      let sum = 0;

      for (const cat of res.body as Array<{ name: string; count: number }>) {
        expect(cat.name.length).toBeGreaterThan(0);
        expect(names.has(cat.name)).toBe(false);
        names.add(cat.name);
        sum += cat.count;
      }

      expect(sum).toBe(10_000);
    });
  });
});
