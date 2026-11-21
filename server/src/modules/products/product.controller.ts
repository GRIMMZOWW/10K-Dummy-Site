import type { NextFunction, Request, Response } from 'express';
import type { ProductListQuery, ProductSlugParam } from './product.schema';
import { productService } from './product.service';

export const productController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = res.locals.validatedQuery as ProductListQuery;
      const result = await productService.listProducts(query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getBySlug(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = res.locals.validatedParams as ProductSlugParam;
      const product = await productService.getProductBySlug(slug);
      res.json(product);
    } catch (err) {
      next(err);
    }
  },

  async categories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await productService.listCategories();
      res.json(categories);
    } catch (err) {
      next(err);
    }
  },
};
