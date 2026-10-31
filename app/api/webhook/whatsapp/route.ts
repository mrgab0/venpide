import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { SiteConfig } from "@/lib/models/SiteConfig";
import { WhatsAppChat } from "@/lib/models/WhatsAppChat";
import { WhatsAppMessage } from "@/lib/models/WhatsAppMessage";
import { Driver } from "@/lib/models/Driver";
import { sendMetaWhatsAppMessage, normalizeWhatsAppNumber } from "@/lib/utils/metaWhatsApp";

export const runtime = "nodejs";

/**
 * GET: Verificación del Webhook por Meta
 * Meta envía una solicitud GET con hub.mode, hub.verify_token y hub.challenge
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    await dbConnect();
    const config = await SiteConfig.findOne({ key: "global" }).lean();
    const expectedToken =
      (config as any)?.metaWhatsAppConfig?.verifyToken ||
      process.env.META_WA_VERIFY_TOKEN ||
      "venpide_webhook_token_2026";

    if (mode === "subscribe" && token === expectedToken) {
      console.log("[Meta Webhook] Handshake verificado con éxito");
      return new Response(challenge, { status: 200 });
    }

    console.warn("[Meta Webhook] Token de verificación inválido:", token);
    return new Response("Forbidden", { status: 403 });
  } catch (error: any) {
    console.error("[Meta Webhook GET Error]", error);
    return new Response("Internal Error", { status: 500 });
  }
}

/**
 * POST: Recepción de eventos y mensajes entrantes de WhatsApp
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object !== "whatsapp_business_account") {
      return new Response("Not Found", { status: 404 });
    }

    await dbConnect();

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const val = change.value;
        if (!val || !val.messages || val.messages.length === 0) continue;

        const messageData = val.messages[0];
        const rawFrom = messageData.from; // Ej: "584121234567"
        const cleanFrom = normalizeWhatsAppNumber(rawFrom);
        const metaMessageId = messageData.id;
        const msgType = messageData.type;

        // Extraer texto o descripción del mensaje
        let messageText = "";
        let mediaUrl = "";
        let locationData: any = undefined;

        if (msgType === "text") {
          messageText = messageData.text?.body || "";
        } else if (msgType === "location") {
          locationData = {
            lat: messageData.location?.latitude,
            lng: messageData.location?.longitude,
            address: messageData.location?.address || messageData.location?.name || "Ubicación compartida",
          };
          messageText = `📍 Ubicación: ${locationData.address || `${locationData.lat}, ${locationData.lng}`}`;
        } else if (msgType === "image") {
          messageText = messageData.image?.caption || "📷 Imagen recibida";
        } else if (msgType === "audio") {
          messageText = "🎙️ Nota de voz recibida";
        } else {
          messageText = `[Mensaje ${msgType}]`;
        }

        // Obtener nombre del perfil de WhatsApp si está disponible
        const contactProfile = val.contacts?.[0]?.profile?.name || "";

        // =========================================================================
        // 1. Verificar si el remitente es un Conductor (Driver) Registrado
        // =========================================================================
        const driver = await Driver.findOne({ phone: cleanFrom });

        if (driver) {
          // El mensaje proviene de un conductor (mototaxi/repartidor)
          let activeChat = await WhatsAppChat.findOne({
            "assignedDriver.phone": cleanFrom,
            status: { $in: ["assigned", "in_delivery", "open"] },
          }).sort({ lastMessageAt: -1 });

          if (!activeChat) {
            // Si no tiene chat asignado en curso, asociar al último abierto
            activeChat = await WhatsAppChat.findOne({ status: "open" }).sort({ lastMessageAt: -1 });
          }

          if (activeChat) {
            // Guardar en la conversación
            await WhatsAppMessage.create({
              chatId: activeChat.chatId,
              metaMessageId,
              senderType: "driver",
              senderName: driver.name,
              senderPhone: cleanFrom,
              text: messageText,
              mediaType: msgType === "location" ? "location" : "text",
              location: locationData,
              status: "delivered",
              createdAt: new Date(),
            });

            activeChat.lastMessage = messageText;
            activeChat.lastSender = "driver";
            activeChat.lastMessageAt = new Date();
            activeChat.unreadAdminCount = (activeChat.unreadAdminCount || 0) + 1;
            await activeChat.save();

            // Reenviar mensaje al cliente automáticamente (puente de comunicación)
            await sendMetaWhatsAppMessage({
              to: activeChat.customerPhone,
              text: `🛵 [Tu Conductor ${driver.name}]: ${messageText}`,
            });
          }
        } else {
          // =========================================================================
          // 2. El mensaje proviene de un Cliente
          // =========================================================================
          let customerChat = await WhatsAppChat.findOne({ chatId: cleanFrom });

          if (!customerChat) {
            customerChat = await WhatsAppChat.create({
              chatId: cleanFrom,
              customerPhone: cleanFrom,
              customerName: contactProfile || `Cliente +${cleanFrom.slice(-4)}`,
              status: "open",
              unreadAdminCount: 1,
              lastMessage: messageText,
              lastSender: "customer",
              lastMessageAt: new Date(),
            });
          } else {
            customerChat.lastMessage = messageText;
            customerChat.lastSender = "customer";
            customerChat.lastMessageAt = new Date();
            customerChat.unreadAdminCount = (customerChat.unreadAdminCount || 0) + 1;
            if (contactProfile && customerChat.customerName.startsWith("Cliente +")) {
              customerChat.customerName = contactProfile;
            }
            await customerChat.save();
          }

          // Registrar mensaje en el historial del chat
          await WhatsAppMessage.create({
            chatId: cleanFrom,
            metaMessageId,
            senderType: "customer",
            senderName: customerChat.customerName,
            senderPhone: cleanFrom,
            text: messageText,
            mediaType: msgType === "location" ? "location" : "text",
            location: locationData,
            status: "delivered",
            createdAt: new Date(),
          });

          // Si hay un conductor asignado a este cliente, reenviarle el mensaje al chofer
          if (customerChat.assignedDriver?.phone) {
            await sendMetaWhatsAppMessage({
              to: customerChat.assignedDriver.phone,
              text: `[Cliente ${customerChat.customerName}]: ${messageText}`,
            });
          }
        }
      }
    }

    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (error: any) {
    console.error("[Meta Webhook POST Error]", error);
    // Responder siempre 200 para evitar reintentos continuos de Meta en caso de error de parseo
    return new Response("EVENT_RECEIVED", { status: 200 });
  }
}
