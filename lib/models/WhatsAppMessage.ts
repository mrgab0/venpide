import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppMessage extends Document {
  chatId: string;
  metaMessageId?: string;
  senderType: "customer" | "driver" | "admin" | "system";
  senderName: string;
  senderPhone?: string;
  text: string;
  mediaType: "text" | "image" | "audio" | "document" | "location";
  mediaUrl?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  status: "sent" | "delivered" | "read" | "failed";
  createdAt: Date;
}

const WhatsAppMessageSchema: Schema = new Schema(
  {
    chatId: { type: String, required: true, index: true },
    metaMessageId: { type: String, default: "" },
    senderType: {
      type: String,
      enum: ["customer", "driver", "admin", "system"],
      required: true,
      index: true,
    },
    senderName: { type: String, default: "" },
    senderPhone: { type: String, default: "" },
    text: { type: String, default: "" },
    mediaType: {
      type: String,
      enum: ["text", "image", "audio", "document", "location"],
      default: "text",
    },
    mediaUrl: { type: String, default: "" },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      address: { type: String },
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read", "failed"],
      default: "sent",
    },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const WhatsAppMessage =
  mongoose.models.WhatsAppMessage ||
  mongoose.model<IWhatsAppMessage>("WhatsAppMessage", WhatsAppMessageSchema);
