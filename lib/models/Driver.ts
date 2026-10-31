import mongoose, { Schema, Document } from "mongoose";

export interface IDriver extends Document {
  name: string;
  phone: string;
  vehicleType: "moto" | "carro" | "bicicleta" | "camioneta";
  plate: string;
  status: "available" | "busy" | "offline";
  rating?: number;
  totalDeliveries?: number;
  activeOrderId?: string;
  activeChatId?: string;
  notes?: string;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DriverSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true, trim: true },
    vehicleType: {
      type: String,
      enum: ["moto", "carro", "bicicleta", "camioneta"],
      default: "moto",
    },
    plate: { type: String, default: "" },
    status: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "available",
    },
    rating: { type: Number, default: 5.0 },
    totalDeliveries: { type: Number, default: 0 },
    activeOrderId: { type: String, default: "" },
    activeChatId: { type: String, default: "" },
    notes: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Driver = mongoose.models.Driver || mongoose.model<IDriver>("Driver", DriverSchema);
