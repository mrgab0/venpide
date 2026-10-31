"use server";

import dbConnect from "@/lib/db";
import { WhatsAppChat, IWhatsAppChat } from "@/lib/models/WhatsAppChat";
import { WhatsAppMessage } from "@/lib/models/WhatsAppMessage";
import { Driver, IDriver } from "@/lib/models/Driver";
import { SiteConfig } from "@/lib/models/SiteConfig";
import { sendMetaWhatsAppMessage, normalizeWhatsAppNumber } from "@/lib/utils/metaWhatsApp";
import { revalidatePath } from "next/cache";

// =========================================================================
// 1. CONVERSACIONES / CHATS CRM
// =========================================================================

export async function getWhatsAppChatsAction(filterStatus: string = "all", search: string = "") {
  await dbConnect();
  try {
    const query: any = {};

    if (filterStatus && filterStatus !== "all") {
      query.status = filterStatus;
    }

    if (search && search.trim().length > 0) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { customerName: regex },
        { customerPhone: regex },
        { orderId: regex },
        { "assignedDriver.name": regex },
      ];
    }

    const chats = await WhatsAppChat.find(query)
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .lean();

    return {
      success: true,
      chats: JSON.parse(JSON.stringify(chats)),
    };
  } catch (error: any) {
    console.error("Error al obtener chats de WhatsApp:", error);
    return { success: false, error: error.message, chats: [] };
  }
}

export async function getWhatsAppMessagesAction(chatId: string) {
  await dbConnect();
  try {
    const normalizedChatId = normalizeWhatsAppNumber(chatId);

    const messages = await WhatsAppMessage.find({ chatId: normalizedChatId })
      .sort({ createdAt: 1 })
      .limit(300)
      .lean();

    // Resetear contador de mensajes sin leer del admin para este chat
    await WhatsAppChat.updateOne(
      { chatId: normalizedChatId },
      { $set: { unreadAdminCount: 0 } }
    );

    return {
      success: true,
      messages: JSON.parse(JSON.stringify(messages)),
    };
  } catch (error: any) {
    console.error("Error al obtener mensajes de WhatsApp:", error);
    return { success: false, error: error.message, messages: [] };
  }
}

export async function sendAdminWhatsAppMessageAction(chatId: string, text: string) {
  await dbConnect();
  try {
    if (!text || !text.trim()) {
      return { success: false, error: "El mensaje no puede estar vacío" };
    }

    const normalizedChatId = normalizeWhatsAppNumber(chatId);
    const chat = await WhatsAppChat.findOne({ chatId: normalizedChatId });

    if (!chat) {
      return { success: false, error: "Conversación no encontrada" };
    }

    // 1. Guardar mensaje en base de datos local
    const newMsg = await WhatsAppMessage.create({
      chatId: normalizedChatId,
      senderType: "admin",
      senderName: "Admin Venpide",
      senderPhone: "Central",
      text: text.trim(),
      mediaType: "text",
      status: "sent",
      createdAt: new Date(),
    });

    // 2. Despachar a través de la API oficial de Meta WhatsApp
    const sendResult = await sendMetaWhatsAppMessage({
      to: chat.customerPhone,
      text: text.trim(),
    });

    if (sendResult.messageId) {
      newMsg.metaMessageId = sendResult.messageId;
      await newMsg.save();
    }

    // 3. Actualizar resumen de la conversación
    chat.lastMessage = text.trim();
    chat.lastSender = "admin";
    chat.lastMessageAt = new Date();
    await chat.save();

    // 4. Si hay un driver asignado, avisarle al driver de la instrucción del admin
    if (chat.assignedDriver?.phone) {
      await sendMetaWhatsAppMessage({
        to: chat.assignedDriver.phone,
        text: `[Central Venpide a Cliente ${chat.customerName}]: ${text.trim()}`,
      });
    }

    revalidatePath("/admin/whatsapp");
    return {
      success: true,
      message: JSON.parse(JSON.stringify(newMsg)),
      simulated: sendResult.simulated || false,
    };
  } catch (error: any) {
    console.error("Error al enviar mensaje del admin:", error);
    return { success: false, error: error.message };
  }
}

// =========================================================================
// 2. ASIGNACIÓN DE CONDUCTORES Y ESTADOS
// =========================================================================

export async function assignDriverToChatAction(chatId: string, driverId: string) {
  await dbConnect();
  try {
    const normalizedChatId = normalizeWhatsAppNumber(chatId);
    const chat = await WhatsAppChat.findOne({ chatId: normalizedChatId });
    if (!chat) {
      return { success: false, error: "Conversación no encontrada" };
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return { success: false, error: "Conductor no encontrado" };
    }

    // Asignar conductor al chat
    chat.assignedDriver = {
      driverId: driver._id.toString(),
      name: driver.name,
      phone: driver.phone,
      vehicleType: driver.vehicleType,
      plate: driver.plate || "",
      assignedAt: new Date(),
    };
    chat.status = "assigned";
    chat.lastMessage = `🛵 Driver asignado: ${driver.name} (${driver.vehicleType})`;
    chat.lastSender = "system";
    chat.lastMessageAt = new Date();
    await chat.save();

    // Actualizar estado del driver
    driver.status = "busy";
    driver.activeChatId = normalizedChatId;
    driver.totalDeliveries = (driver.totalDeliveries || 0) + 1;
    await driver.save();

    // Crear mensaje del sistema en la conversación
    await WhatsAppMessage.create({
      chatId: normalizedChatId,
      senderType: "system",
      senderName: "Sistema Venpide",
      text: `🛵 Conductor asignado: ${driver.name} • Vehículo: ${driver.vehicleType.toUpperCase()} ${driver.plate ? `[${driver.plate}]` : ""}. Teléfono: ${driver.phone}`,
      status: "delivered",
      createdAt: new Date(),
    });

    // Enviar notificación por WhatsApp al Conductor con detalles del cliente y orden
    const driverAlert = `🛵 ¡Nuevo servicio asignado en Venpide!
Cliente: ${chat.customerName}
Teléfono: ${chat.customerPhone}
Orden Ref: ${chat.orderId || "Entrega directa"}
Por favor abre comunicación con el cliente o responde este mensaje para actualizar el estatus.`;

    await sendMetaWhatsAppMessage({
      to: driver.phone,
      text: driverAlert,
    });

    // Enviar mensaje de cortesía al cliente informando de su chofer
    const customerAlert = `¡Hola ${chat.customerName}! Tu conductor ${driver.name} (${driver.vehicleType.toUpperCase()}) ha sido asignado para tu entrega. Cualquier mensaje que envíes por aquí llegará tanto al conductor como a la central.`;
    await sendMetaWhatsAppMessage({
      to: chat.customerPhone,
      text: customerAlert,
    });

    revalidatePath("/admin/whatsapp");
    return {
      success: true,
      chat: JSON.parse(JSON.stringify(chat)),
    };
  } catch (error: any) {
    console.error("Error al asignar conductor:", error);
    return { success: false, error: error.message };
  }
}

export async function updateChatStatusAction(chatId: string, status: string) {
  await dbConnect();
  try {
    const normalizedChatId = normalizeWhatsAppNumber(chatId);
    const chat = await WhatsAppChat.findOne({ chatId: normalizedChatId });
    if (!chat) {
      return { success: false, error: "Conversación no encontrada" };
    }

    const prevStatus = chat.status;
    chat.status = status as any;
    chat.lastMessage = `Estado actualizado a: ${status.toUpperCase()}`;
    chat.lastSender = "system";
    chat.lastMessageAt = new Date();
    await chat.save();

    // Registrar mensaje del sistema
    await WhatsAppMessage.create({
      chatId: normalizedChatId,
      senderType: "system",
      senderName: "Sistema Venpide",
      text: `Estatus cambiado de [${prevStatus}] a [${status}].`,
      status: "delivered",
      createdAt: new Date(),
    });

    // Si se marca como entregado o cerrado, liberar al conductor si estaba ocupado
    if (["delivered", "closed"].includes(status) && chat.assignedDriver?.driverId) {
      await Driver.findByIdAndUpdate(chat.assignedDriver.driverId, {
        status: "available",
        activeChatId: "",
        activeOrderId: "",
      });
    }

    revalidatePath("/admin/whatsapp");
    return { success: true };
  } catch (error: any) {
    console.error("Error al actualizar estado del chat:", error);
    return { success: false, error: error.message };
  }
}

// =========================================================================
// 3. GESTIÓN DE CONDUCTORES / MOTO TAXIS (CRUD)
// =========================================================================

export async function getDriversListAction() {
  await dbConnect();
  try {
    const drivers = await Driver.find().sort({ status: 1, name: 1 }).lean();
    return {
      success: true,
      drivers: JSON.parse(JSON.stringify(drivers)),
    };
  } catch (error: any) {
    console.error("Error al obtener lista de drivers:", error);
    return { success: false, error: error.message, drivers: [] };
  }
}

export async function saveDriverAction(driverData: {
  _id?: string;
  name: string;
  phone: string;
  vehicleType: "moto" | "carro" | "bicicleta" | "camioneta";
  plate?: string;
  status?: "available" | "busy" | "offline";
  notes?: string;
}) {
  await dbConnect();
  try {
    const cleanedPhone = normalizeWhatsAppNumber(driverData.phone);
    if (!cleanedPhone) {
      return { success: false, error: "El teléfono del conductor es requerido y debe ser válido" };
    }

    if (driverData._id) {
      // Actualizar existente
      const updated = await Driver.findByIdAndUpdate(
        driverData._id,
        {
          name: driverData.name,
          phone: cleanedPhone,
          vehicleType: driverData.vehicleType || "moto",
          plate: driverData.plate || "",
          status: driverData.status || "available",
          notes: driverData.notes || "",
        },
        { new: true }
      );
      return { success: true, driver: JSON.parse(JSON.stringify(updated)) };
    } else {
      // Crear nuevo
      const existing = await Driver.findOne({ phone: cleanedPhone });
      if (existing) {
        return { success: false, error: "Ya existe un conductor registrado con este número telefónico" };
      }

      const created = await Driver.create({
        name: driverData.name,
        phone: cleanedPhone,
        vehicleType: driverData.vehicleType || "moto",
        plate: driverData.plate || "",
        status: driverData.status || "available",
        notes: driverData.notes || "",
      });

      return { success: true, driver: JSON.parse(JSON.stringify(created)) };
    }
  } catch (error: any) {
    console.error("Error al guardar conductor:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteDriverAction(driverId: string) {
  await dbConnect();
  try {
    await Driver.findByIdAndDelete(driverId);
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar conductor:", error);
    return { success: false, error: error.message };
  }
}

// =========================================================================
// 4. CONFIGURACIÓN META CLOUD API WHATSAPP
// =========================================================================

export async function getMetaWhatsAppConfigAction() {
  await dbConnect();
  try {
    const config = await SiteConfig.findOne({ key: "global" }).lean();
    return {
      success: true,
      config: (config as any)?.metaWhatsAppConfig || {
        phoneNumberId: "",
        wabaId: "",
        accessToken: "",
        verifyToken: "venpide_webhook_token_2026",
        webhookUrl: "/api/webhook/whatsapp",
        autoForwardToDriver: true,
        autoForwardToCustomer: true,
      },
    };
  } catch (error: any) {
    console.error("Error al obtener configuración de WhatsApp Meta:", error);
    return { success: false, error: error.message };
  }
}

export async function saveMetaWhatsAppConfigAction(data: {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  verifyToken: string;
  autoForwardToDriver: boolean;
  autoForwardToCustomer: boolean;
}) {
  await dbConnect();
  try {
    await SiteConfig.updateOne(
      { key: "global" },
      {
        $set: {
          metaWhatsAppConfig: {
            phoneNumberId: data.phoneNumberId.trim(),
            wabaId: data.wabaId.trim(),
            accessToken: data.accessToken.trim(),
            verifyToken: data.verifyToken.trim() || "venpide_webhook_token_2026",
            webhookUrl: "/api/webhook/whatsapp",
            autoForwardToDriver: data.autoForwardToDriver,
            autoForwardToCustomer: data.autoForwardToCustomer,
          },
        },
      },
      { upsert: true }
    );

    revalidatePath("/admin/whatsapp");
    return { success: true };
  } catch (error: any) {
    console.error("Error al guardar configuración de WhatsApp Meta:", error);
    return { success: false, error: error.message };
  }
}

// =========================================================================
// 5. SIMULADOR DE PRUEBAS DE MENSAJERÍA
// =========================================================================

export async function simulateIncomingWhatsAppMessageAction(payload: {
  fromPhone: string;
  customerName?: string;
  text: string;
  isDriver?: boolean;
}) {
  await dbConnect();
  try {
    const cleanPhone = normalizeWhatsAppNumber(payload.fromPhone);
    if (!cleanPhone || !payload.text) {
      return { success: false, error: "Teléfono y texto requeridos" };
    }

    if (payload.isDriver) {
      // El mensaje viene de un conductor
      const driver = await Driver.findOne({ phone: cleanPhone });
      const driverName = driver?.name || `Driver ${cleanPhone}`;

      // Buscar si el conductor tiene un chat activo
      let targetChat = await WhatsAppChat.findOne({ "assignedDriver.phone": cleanPhone });

      if (!targetChat) {
        // Asignar al chat más reciente abierto si existe
        targetChat = await WhatsAppChat.findOne({ status: "open" }).sort({ lastMessageAt: -1 });
      }

      if (!targetChat) {
        return { success: false, error: "No se encontró una conversación activa asignada a este conductor" };
      }

      // Guardar mensaje del driver
      const newMsg = await WhatsAppMessage.create({
        chatId: targetChat.chatId,
        senderType: "driver",
        senderName: driverName,
        senderPhone: cleanPhone,
        text: payload.text.trim(),
        mediaType: "text",
        status: "delivered",
        createdAt: new Date(),
      });

      targetChat.lastMessage = payload.text.trim();
      targetChat.lastSender = "driver";
      targetChat.lastMessageAt = new Date();
      targetChat.unreadAdminCount = (targetChat.unreadAdminCount || 0) + 1;
      await targetChat.save();

      // Reenviar al cliente si está habilitado
      await sendMetaWhatsAppMessage({
        to: targetChat.customerPhone,
        text: `🛵 [Tu Conductor ${driverName}]: ${payload.text.trim()}`,
      });

      revalidatePath("/admin/whatsapp");
      return { success: true, message: JSON.parse(JSON.stringify(newMsg)) };
    } else {
      // El mensaje viene de un Cliente
      let chat = await WhatsAppChat.findOne({ chatId: cleanPhone });
      if (!chat) {
        chat = await WhatsAppChat.create({
          chatId: cleanPhone,
          customerPhone: cleanPhone,
          customerName: payload.customerName || `Cliente ${cleanPhone.slice(-4)}`,
          status: "open",
          unreadAdminCount: 1,
          lastMessage: payload.text.trim(),
          lastSender: "customer",
          lastMessageAt: new Date(),
        });
      } else {
        chat.lastMessage = payload.text.trim();
        chat.lastSender = "customer";
        chat.lastMessageAt = new Date();
        chat.unreadAdminCount = (chat.unreadAdminCount || 0) + 1;
        await chat.save();
      }

      const newMsg = await WhatsAppMessage.create({
        chatId: cleanPhone,
        senderType: "customer",
        senderName: chat.customerName,
        senderPhone: cleanPhone,
        text: payload.text.trim(),
        mediaType: "text",
        status: "delivered",
        createdAt: new Date(),
      });

      // Si hay un driver asignado, avisarle
      if (chat.assignedDriver?.phone) {
        await sendMetaWhatsAppMessage({
          to: chat.assignedDriver.phone,
          text: `[Cliente ${chat.customerName}]: ${payload.text.trim()}`,
        });
      }

      revalidatePath("/admin/whatsapp");
      return { success: true, message: JSON.parse(JSON.stringify(newMsg)) };
    }
  } catch (error: any) {
    console.error("Error en simulador:", error);
    return { success: false, error: error.message };
  }
}
