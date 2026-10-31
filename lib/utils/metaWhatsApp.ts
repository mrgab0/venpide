import dbConnect from "@/lib/db";
import { SiteConfig } from "@/lib/models/SiteConfig";

export interface SendWhatsAppPayload {
  to: string; // Recipient phone number (E.164 without '+' or standard digits)
  text: string;
  previewUrl?: boolean;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

/**
 * Standardize phone number for WhatsApp Meta Graph API
 * Removes '+', spaces, dashes, parentheses
 */
export function normalizeWhatsAppNumber(rawPhone: string): string {
  if (!rawPhone) return "";
  let cleaned = rawPhone.replace(/\D/g, "");
  // If starts with 00, replace with nothing
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
}

/**
 * Sends a message via Meta Cloud API v21.0
 * If credentials are not yet set in SiteConfig or environment variables,
 * falls back to simulated mode and logs details without crashing.
 */
export async function sendMetaWhatsAppMessage({
  to,
  text,
  previewUrl = false,
}: SendWhatsAppPayload): Promise<SendWhatsAppResult> {
  try {
    await dbConnect();
    const configDoc = await SiteConfig.findOne({ key: "global" }).lean();
    const metaConfig = (configDoc as any)?.metaWhatsAppConfig;

    const phoneNumberId =
      metaConfig?.phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID || "";
    const accessToken =
      metaConfig?.accessToken || process.env.META_WA_ACCESS_TOKEN || "";

    const recipient = normalizeWhatsAppNumber(to);

    if (!recipient) {
      return { success: false, error: "Número de teléfono destino no válido" };
    }

    // Fallback: Modo Simulado si no hay credenciales de Meta aún
    if (!phoneNumberId || !accessToken) {
      console.warn(
        `[MetaWhatsApp] Modo Simulado: No se ha configurado META_WA_PHONE_NUMBER_ID o META_WA_ACCESS_TOKEN. Mensaje para ${recipient}: "${text}"`
      );
      return {
        success: true,
        simulated: true,
        messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      };
    }

    const endpoint = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: {
        preview_url: previewUrl,
        body: text,
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[MetaWhatsApp Error]", data);
      return {
        success: false,
        error: data?.error?.message || "Error al enviar mensaje a través de Meta API",
      };
    }

    const messageId = data?.messages?.[0]?.id || `wamid.${Date.now()}`;
    return {
      success: true,
      messageId,
      simulated: false,
    };
  } catch (error: any) {
    console.error("[MetaWhatsApp Exception]", error);
    return {
      success: false,
      error: error?.message || "Error de red al conectar con Meta Cloud API",
    };
  }
}
