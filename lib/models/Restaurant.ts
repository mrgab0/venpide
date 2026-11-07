import mongoose, { Schema, Document } from "mongoose";

export interface IRestaurant extends Document {
  name: string;
  slug: string;
  phone: string; // Standardized WhatsApp number e.g. "584121234567"
  address: string;
  googleMapsUrl: string; // Google Maps GPS link e.g. "https://maps.google.com/?q=10.4806,-66.9036"
  category: string;
  avgPrepTimeMin: number;
  isActive: boolean;
  menuSummary?: string;
  rating?: number;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RestaurantSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    address: { type: String, required: true, trim: true },
    googleMapsUrl: { type: String, default: "" },
    category: { type: String, default: "Comida Rápida" },
    avgPrepTimeMin: { type: Number, default: 25 },
    isActive: { type: Boolean, default: true },
    menuSummary: { type: String, default: "" },
    rating: { type: Number, default: 5.0 },
    logoUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Restaurant =
  mongoose.models.Restaurant || mongoose.model<IRestaurant>("Restaurant", RestaurantSchema);
