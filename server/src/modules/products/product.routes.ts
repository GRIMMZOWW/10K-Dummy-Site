import { Router } from 'express';
import { validateParams, validateQuery } from '../../middleware/validate';
import { productController } from './product.controller';
import { productListQuerySchema, productSlugParamSchema } from './product.schema';

export const productsRouter = Router();

productsRouter.get('/products', validateQuery(productListQuerySchema), productController.list);
productsRouter.get(
  '/products/:slug',
  validateParams(productSlugParamSchema),
  productController.getBySlug,
);
productsRouter.get('/categories', productController.categories);
