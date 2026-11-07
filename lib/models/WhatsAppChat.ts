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
  customerEmail?: string;
  serviceType?: "delivery" | "traslado" | "mandaito" | "flete" | "";
  paymentMethod?: "pago_movil" | "efectivo" | "zelle" | "binance" | "";
  paymentStatus?: "unpaid" | "pending_verification" | "paid" | "failed";
  paymentRef?: string;
  conversationStep?:
    | "greeting"
    | "awaiting_service"
    | "awaiting_details"
    | "awaiting_payment_method"
    | "awaiting_payment_proof"
    | "dispatching"
    | "completed";
  assignedDriver?: IAssignedDriver;
  orderId?: string;
  restaurantId?: string;
  restaurantName?: string;
  restaurantPhone?: string;
  restaurantGoogleMapsUrl?: string;
  deliveryAddress?: string;
  totalAmount?: number;
  cancellationReason?: string;
  driverLiveLocationUrl?: string;
  orderStage?:
    | "draft"
    | "pending_restaurant"
    | "restaurant_accepted"
    | "broadcasting_drivers"
    | "driver_assigned"
    | "in_delivery"
    | "driver_delivered"
    | "completed"
    | "cancelled";
  stageUpdatedAt?: Date;
  status: "open" | "assigned" | "in_delivery" | "delivered" | "closed" | "cancelled";
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
    customerEmail: { type: String, default: "" },
    serviceType: {
      type: String,
      enum: ["delivery", "traslado", "mandaito", "flete", ""],
      default: "",
    },
    paymentMethod: {
      type: String,
      enum: ["pago_movil", "efectivo", "zelle", "binance", ""],
      default: "",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending_verification", "paid", "failed"],
      default: "unpaid",
      index: true,
    },
    paymentRef: { type: String, default: "" },
    conversationStep: {
      type: String,
      enum: [
        "greeting",
        "awaiting_service",
        "awaiting_details",
        "awaiting_payment_method",
        "awaiting_payment_proof",
        "dispatching",
        "completed",
      ],
      default: "greeting",
    },
    assignedDriver: { type: AssignedDriverSchema, default: null },
    orderId: { type: String, default: "" },
    restaurantId: { type: String, default: "" },
    restaurantName: { type: String, default: "" },
    restaurantPhone: { type: String, default: "" },
    restaurantGoogleMapsUrl: { type: String, default: "" },
    deliveryAddress: { type: String, default: "" },
    totalAmount: { type: Number, default: 0 },
    cancellationReason: { type: String, default: "" },
    driverLiveLocationUrl: { type: String, default: "" },
    orderStage: {
      type: String,
      enum: [
        "draft",
        "pending_restaurant",
        "restaurant_accepted",
        "broadcasting_drivers",
        "driver_assigned",
        "in_delivery",
        "driver_delivered",
        "completed",
        "cancelled",
      ],
      default: "draft",
      index: true,
    },
    stageUpdatedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["open", "assigned", "in_delivery", "delivered", "closed", "cancelled"],
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
