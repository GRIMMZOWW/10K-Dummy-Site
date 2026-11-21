import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';

const FORBIDDEN_RAW_KEYS = ['__proto__', 'constructor', 'prototype'];

function hasHostileQueryKeys(originalUrl: string): boolean {
  const qIndex = originalUrl.indexOf('?');
  if (qIndex === -1) return false;
  const rawQuery = originalUrl.slice(qIndex + 1);
  if (!rawQuery) return false;

  for (const pair of rawQuery.split('&')) {
    if (!pair) continue;
    const eqIndex = pair.indexOf('=');
    const rawKey = eqIndex === -1 ? pair : pair.slice(0, eqIndex);
    let decodedKey = rawKey;
    try {
      decodedKey = decodeURIComponent(rawKey);
    } catch {
      return true;
    }
    const lowerKey = decodedKey.toLowerCase();
    if (
      FORBIDDEN_RAW_KEYS.some(
        (bad) => lowerKey === bad || lowerKey.startsWith(`${bad}[`) || lowerKey.includes(`[${bad}`),
      ) ||
      lowerKey.includes('[$')
    ) {
      return true;
    }
  }
  return false;
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (hasHostileQueryKeys(req.originalUrl)) {
      res.status(400).json({ error: 'Invalid query parameter syntax' });
      return;
    }

    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    res.locals.validatedQuery = result.data;
    next();
  };
}

export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    res.locals.validatedParams = result.data;
    next();
  };
}
