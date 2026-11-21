import compression from 'compression';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { logger } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import { productsRouter } from './modules/products/product.routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(compression());
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 100_000,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(express.json());

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info(
        {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: Date.now() - start,
        },
        'HTTP request',
      );
    });
    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.use('/api', productsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
