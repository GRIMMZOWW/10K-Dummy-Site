import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const productSchema = new Schema(
  {
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    titleLower: {
      type: String,
      required: true,
      trim: true,
    },
    searchText: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: false,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'price must be an integer in minor units',
      },
    },
    discountPercentage: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      max: 500,
      validate: {
        validator: Number.isInteger,
        message: 'stock must be an integer',
      },
    },
    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

// All 10 indexes defined in PLAN.md Section 3
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ category: 1, rating: -1, createdAt: -1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1, createdAt: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ titleLower: 1 });
productSchema.index({ title: 'text', description: 'text', tags: 'text' });

export type Product = InferSchemaType<typeof productSchema>;
export type ProductDocument = HydratedDocument<Product>;

export const ProductModel = model<Product>('Product', productSchema);
