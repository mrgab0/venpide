import mongoose, { Schema, Document } from "mongoose";

export interface IPagoMovilReference extends Document {
  reference: string; // Número de referencia bancaria (ej. "849201", "12345678")
  bankCode?: string; // Código de banco ej. "0102" (BDV), "0134" (Banesco)
  bankName?: string; // Nombre del banco
  amountBs?: number; // Monto en Bolívares
  amountUsd?: number; // Monto equivalente en USD
  customerPhone: string; // Teléfono del pagador
  customerName?: string;
  customerEmail?: string;
  chatId: string; // Chat ID de WhatsApp
  orderId?: string; // Ref de orden Venpide
  proofImageUrl?: string; // URL de la captura si vino por imagen
  status: "verified" | "rejected" | "duplicate" | "pending_bank";
  verificationSource: "ocr" | "text" | "manual";
  rejectionReason?: string;
  verifiedAt?: Date;
  rawText?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PagoMovilReferenceSchema: Schema = new Schema(
  {
    reference: { type: String, required: true, index: true, trim: true },
    bankCode: { type: String, default: "" },
    bankName: { type: String, default: "" },
    amountBs: { type: Number, default: 0 },
    amountUsd: { type: Number, default: 0 },
    customerPhone: { type: String, required: true, index: true, trim: true },
    customerName: { type: String, default: "" },
    customerEmail: { type: String, default: "" },
    chatId: { type: String, required: true, index: true },
    orderId: { type: String, default: "", index: true },
    proofImageUrl: { type: String, default: "" },
    status: {
      type: String,
      enum: ["verified", "rejected", "duplicate", "pending_bank"],
      default: "pending_bank",
      index: true,
    },
    verificationSource: {
      type: String,
      enum: ["ocr", "text", "manual"],
      default: "text",
    },
    rejectionReason: { type: String, default: "" },
    verifiedAt: { type: Date },
    rawText: { type: String, default: "" },
  },
  { timestamps: true }
);

// Índice compuesto para optimizar la búsqueda anti-duplicados por referencia y fecha
PagoMovilReferenceSchema.index({ reference: 1, createdAt: -1 });

export const PagoMovilReference =
  mongoose.models.PagoMovilReference ||
  mongoose.model<IPagoMovilReference>("PagoMovilReference", PagoMovilReferenceSchema);
