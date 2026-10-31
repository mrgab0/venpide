import mongoose, { Schema, Document } from "mongoose";

export interface IAssignedDriver {
  driverId: string;
  name: string;
  phone: string;
  vehicleType: string;
  plate?: string;
  assignedAt: Date;
}

export interface IWhatsAppChat extends Document {
  chatId: string; // Standardized customer phone e.g. "584121234567"
  customerName: string;
  customerPhone: string;
  assignedDriver?: IAssignedDriver;
  orderId?: string;
  status: "open" | "assigned" | "in_delivery" | "delivered" | "closed";
  lastMessage: string;
  lastSender: "customer" | "driver" | "admin" | "system";
  lastMessageAt: Date;
  unreadAdminCount: number;
  unreadDriverCount: number;
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssignedDriverSchema = new Schema(
  {
    driverId: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    vehicleType: { type: String, default: "moto" },
    plate: { type: String, default: "" },
    assignedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WhatsAppChatSchema: Schema = new Schema(
  {
    chatId: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, default: "Cliente Venpide" },
    customerPhone: { type: String, required: true, index: true },
    assignedDriver: { type: AssignedDriverSchema, default: null },
    orderId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["open", "assigned", "in_delivery", "delivered", "closed"],
      default: "open",
      index: true,
    },
    lastMessage: { type: String, default: "" },
    lastSender: {
      type: String,
      enum: ["customer", "driver", "admin", "system"],
      default: "customer",
    },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    unreadAdminCount: { type: Number, default: 0 },
    unreadDriverCount: { type: Number, default: 0 },
    tags: { type: [String], default: ["Delivery"] },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const WhatsAppChat =
  mongoose.models.WhatsAppChat ||
  mongoose.model<IWhatsAppChat>("WhatsAppChat", WhatsAppChatSchema);
