import { z } from 'zod';
import { CURRENCY } from '../../config/env';

export function toMinorUnits(major: number): number {
  return Math.round(major * CURRENCY.minorUnitFactor);
}

const MAJOR_PRICE_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const MAX_SAFE_MAJOR_PRICE = 10_000_000;

const noNullBytes = (val: string) => !val.includes('\0');

const priceQuerySchema = z.preprocess(
  (val) => {
    if (val === undefined || val === '') return undefined;
    return typeof val === 'number' ? String(val) : val;
  },
  z
    .string()
    .trim()
    .refine(noNullBytes, { message: 'Null bytes are not allowed' })
    .refine((s) => MAJOR_PRICE_PATTERN.test(s), {
      message: 'Price must be a non-negative number with at most 2 decimal places',
    })
    .transform((s) => Number(s))
    .refine((n) => Number.isFinite(n) && n <= MAX_SAFE_MAJOR_PRICE, {
      message: 'Price exceeds maximum allowed value',
    })
    .transform((n) => toMinorUnits(n))
    .optional(),
);

const optionalTrimmedString = (maxLen?: number) =>
  z.preprocess(
    (val) => (val === '' ? undefined : val),
    (maxLen !== undefined
      ? z.string().trim().max(maxLen).refine(noNullBytes, { message: 'Null bytes are not allowed' })
      : z.string().trim().refine(noNullBytes, { message: 'Null bytes are not allowed' })
    ).optional(),
  );

export const SORT_VALUES = [
  'relevance',
  'price_asc',
  'price_desc',
  'rating_desc',
  'newest',
] as const;

export type ProductSort = (typeof SORT_VALUES)[number];

export const productListQuerySchema = z
  .object({
    q: optionalTrimmedString(100),
    category: optionalTrimmedString(100),
    minPrice: priceQuerySchema,
    maxPrice: priceQuerySchema,
    inStock: z
      .literal('true', {
        errorMap: () => ({ message: "inStock must be 'true' when provided" }),
      })
      .transform(() => true)
      .optional(),
    sort: z.enum(SORT_VALUES).default('relevance'),
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(24),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.minPrice !== undefined &&
      data.maxPrice !== undefined &&
      data.minPrice > data.maxPrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minPrice'],
        message: 'minPrice must be less than or equal to maxPrice',
      });
    }
  });

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const productSlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .refine(noNullBytes, { message: 'Null bytes are not allowed' }),
});

export type ProductSlugParam = z.infer<typeof productSlugParamSchema>;
