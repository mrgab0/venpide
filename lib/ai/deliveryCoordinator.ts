import dbConnect from "@/lib/db";
import { Restaurant, IRestaurant } from "@/lib/models/Restaurant";
import { Driver, IDriver } from "@/lib/models/Driver";
import { WhatsAppChat, IWhatsAppChat } from "@/lib/models/WhatsAppChat";
import { WhatsAppMessage } from "@/lib/models/WhatsAppMessage";
import { sendMetaWhatsAppMessage, normalizeWhatsAppNumber } from "@/lib/utils/metaWhatsApp";
import { revalidatePath } from "next/cache";

export interface ParsedOrderIntent {
  isOrderIntent: boolean;
  restaurant?: any;
  itemsSummary: string;
  deliveryAddress: string;
  totalEstimated: number;
  rawText: string;
}

/**
 * 1. Parser inteligente de intención de pedido del cliente (NLP / IA)
 */
export async function parseCustomerOrder(
  text: string,
  customerChat: IWhatsAppChat
): Promise<ParsedOrderIntent> {
  await dbConnect();
  const lowerText = text.toLowerCase();

  // Obtener lista de restaurantes activos
  const activeRestaurants = await Restaurant.find({ isActive: true }).lean();

  // Buscar si el cliente nombra algún restaurante o comida
  let matchedRestaurant: any = null;
  for (const r of activeRestaurants) {
    const rNameLower = r.name.toLowerCase();
    const rCategoryLower = (r.category || "").toLowerCase();
    if (lowerText.includes(rNameLower) || (r.slug && lowerText.includes(r.slug))) {
      matchedRestaurant = r;
      break;
    }
    // Coincidencia por categoría o palabras clave
    if (rCategoryLower && lowerText.includes(rCategoryLower)) {
      matchedRestaurant = r;
    }
  }

  // Si no coincide con ninguno, asignar el primer restaurante activo por defecto
  if (!matchedRestaurant && activeRestaurants.length > 0) {
    matchedRestaurant = activeRestaurants[0];
  }

  // Detectar si parece un pedido (palabras como quiero, pedir, mándame, combo, hamburguesa, pizza, delivery)
  const isOrder =
    lowerText.includes("quiero") ||
    lowerText.includes("pedir") ||
    lowerText.includes("manda") ||
    lowerText.includes("combo") ||
    lowerText.includes("pizza") ||
    lowerText.includes("hamburguesa") ||
    lowerText.includes("pollo") ||
    lowerText.includes("delivery") ||
    lowerText.includes("orden");

  // Extraer dirección aproximada si menciona "en", "a", "para", "calle", "av", "edif"
  let extractedAddress = customerChat.deliveryAddress || "";
  const addressMatch = text.match(/(?:en|hacia|para|calle|av\.|avenida|edif|edificio|res\.|residencia|apto)\s+([^,.\n]+)/i);
  if (addressMatch && addressMatch[1] && addressMatch[1].trim().length > 3) {
    extractedAddress = addressMatch[0].trim();
  }

  return {
    isOrderIntent: isOrder,
    restaurant: matchedRestaurant,
    itemsSummary: text.trim(),
    deliveryAddress: extractedAddress || "Por coordinar en el chat",
    totalEstimated: customerChat.totalAmount || 10.0,
    rawText: text,
  };
}

/**
 * 2. Inicia la confirmación con el Restaurante Aliado (Paso 2 del flujo)
 */
export async function notifyRestaurantForAcceptance(chat: IWhatsAppChat) {
  await dbConnect();
  try {
    const restaurantPhone = chat.restaurantPhone;
    if (!restaurantPhone) {
      console.warn(`[Delivery Coordinator] No hay teléfono de restaurante para orden ${chat.orderId}`);
      return { success: false, error: "Restaurante sin teléfono registrado" };
    }

    chat.orderStage = "pending_restaurant";
    chat.status = "open";
    chat.lastMessage = `Esperando confirmación de ${chat.restaurantName || "Restaurante"}`;
    chat.lastSender = "system";
    chat.stageUpdatedAt = new Date();
    await chat.save();

    const alertMessage = `🔔 ¡NUEVO PEDIDO EN VENPIDE! Ref: #${chat.orderId || "VNP-DIRECTO"}
👤 Cliente: ${chat.customerName}
🏠 Destino Entrega: ${chat.deliveryAddress || "A coordinar"}
💰 Total Estimado: $${chat.totalAmount || 0}

📦 Detalle del Pedido:
${chat.lastMessage || "Pedido por delivery"}

------------------------------------------------
👉 Responde *1* o *ACEPTAR* para confirmar y comenzar preparación.
👉 Responde *2* o *RECHAZAR* si no tienes existencias.`;

    await sendMetaWhatsAppMessage({
      to: restaurantPhone,
      text: alertMessage,
    });

    await WhatsAppMessage.create({
      chatId: chat.chatId,
      senderType: "system",
      senderName: "Sistema Venpide",
      text: `🔔 Solicitud enviada al restaurante ${chat.restaurantName}. Esperando su confirmación...`,
      status: "delivered",
      createdAt: new Date(),
    });

    revalidatePath("/admin/whatsapp");
    return { success: true };
  } catch (err: any) {
    console.error("Error al notificar al restaurante:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 3. Procesa la respuesta del Restaurante (Aceptar o Rechazar)
 */
export async function handleRestaurantReply(restaurantPhone: string, text: string) {
  await dbConnect();
  try {
    const cleanPhone = normalizeWhatsAppNumber(restaurantPhone);
    const upperText = text.trim().toUpperCase();

    // Buscar pedido pendiente de este restaurante
    const chat = await WhatsAppChat.findOne({
      restaurantPhone: cleanPhone,
      orderStage: "pending_restaurant",
    }).sort({ stageUpdatedAt: -1 });

    if (!chat) {
      return { success: false, error: "No hay pedidos pendientes para este restaurante" };
    }

    const isAccepted = upperText === "1" || upperText.includes("ACEPTAR") || upperText.includes("CONFIRMAR") || upperText === "SI";
    const isRejected = upperText === "2" || upperText.includes("RECHAZAR") || upperText.includes("CANCELAR") || upperText === "NO";

    if (isAccepted) {
      // 1. Restaurante aceptó el pedido
      chat.orderStage = "restaurant_accepted";
      chat.lastMessage = `🍳 Confirmado por ${chat.restaurantName}. Buscando conductor...`;
      chat.lastSender = "system";
      chat.stageUpdatedAt = new Date();
      await chat.save();

      // Notificar al restaurante
      await sendMetaWhatsAppMessage({
        to: cleanPhone,
        text: `✅ ¡Pedido #${chat.orderId} confirmado! Ya estamos buscando al motorizado más cercano para el retiro. Te avisaremos cuando sea asignado.`,
      });

      // Notificar al cliente
      await sendMetaWhatsAppMessage({
        to: chat.customerPhone,
        text: `🍳 ¡Buenas noticias! ${chat.restaurantName} ha aceptado tu pedido y ya comenzó su preparación. Estamos asignando a tu conductor moto-taxi.`,
      });

      // 2. Disparar convocatoria a la flota de conductores
      await broadcastToDrivers(chat);

      revalidatePath("/admin/whatsapp");
      return { success: true, action: "accepted" };
    } else if (isRejected) {
      // Restaurante rechazó el pedido
      chat.orderStage = "cancelled";
      chat.status = "cancelled";
      chat.cancellationReason = "Restaurante sin disponibilidad / Rechazado";
      chat.lastMessage = `❌ Rechazado por el restaurante`;
      chat.lastSender = "system";
      chat.stageUpdatedAt = new Date();
      await chat.save();

      await sendMetaWhatsAppMessage({
        to: cleanPhone,
        text: `Entendido. Pedido #${chat.orderId} marcado como cancelado.`,
      });

      await sendMetaWhatsAppMessage({
        to: chat.customerPhone,
        text: `Lo sentimos, ${chat.restaurantName} no tiene disponibilidad para despachar tu pedido en este momento. Si deseas ordenar de otro comercio, por favor escríbenos por aquí.`,
      });

      revalidatePath("/admin/whatsapp");
      return { success: true, action: "rejected" };
    }

    return { success: false, error: "Respuesta no reconocida" };
  } catch (err: any) {
    console.error("Error al procesar respuesta del restaurante:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 4. Convocatoria a la Flota de Conductores (Broadcast / Cola)
 */
export async function broadcastToDrivers(chat: IWhatsAppChat) {
  await dbConnect();
  try {
    chat.orderStage = "broadcasting_drivers";
    chat.stageUpdatedAt = new Date();
    await chat.save();

    // Obtener motorizados disponibles
    const availableDrivers = await Driver.find({ status: "available" }).limit(10).lean();

    if (availableDrivers.length === 0) {
      // Alerta a la central de que no hay choferes libres
      await sendMetaWhatsAppMessage({
        to: chat.customerPhone,
        text: `🛵 Estamos ubicando a un motorizado en tu zona para tu entrega de ${chat.restaurantName}. En breve te confirmamos su asignación.`,
      });
      return { success: false, message: "No hay conductores disponibles actualmente" };
    }

    const broadcastMsg = `🛵 ¡NUEVA CARRERA VENPIDE! Ref: #${chat.orderId || "VNP-DIRECTO"}
📍 Retiro: ${chat.restaurantName || "Restaurante"}
🗺️ Google Maps Local: ${chat.restaurantGoogleMapsUrl || "Ubicación en chat"}
🏠 Destino Entrega: ${chat.deliveryAddress || "A coordinar con cliente"}
💰 Monto a cobrar: $${chat.totalAmount || 0}

------------------------------------------------
👉 Responde *TOMAR* para quedarte con esta carrera inmediatamente.`;

    // Enviar broadcast a los conductores disponibles
    for (const d of availableDrivers) {
      try {
        await sendMetaWhatsAppMessage({
          to: d.phone,
          text: broadcastMsg,
        });
      } catch (e) {
        console.error(`Error enviando broadcast a driver ${d.name}:`, e);
      }
    }

    return { success: true, driversNotified: availableDrivers.length };
  } catch (err: any) {
    console.error("Error en broadcast de conductores:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 5. Procesa la respuesta de un Conductor (TOMAR o ENTREGADO o Ubicación GPS)
 */
export async function handleDriverMessage(
  driver: IDriver,
  text: string,
  locationData?: { lat: number; lng: number; address?: string }
) {
  await dbConnect();
  try {
    const cleanPhone = normalizeWhatsAppNumber(driver.phone);
    const upperText = text.trim().toUpperCase();

    // 1. Manejo de Ubicación en Tiempo Real de Google Maps
    if (locationData && locationData.lat && locationData.lng) {
      const gmapsLiveUrl = `https://maps.google.com/?q=${locationData.lat},${locationData.lng}`;
      driver.liveLocationUrl = gmapsLiveUrl;
      await driver.save();

      // Si el conductor tiene un chat activo en entrega, notificar al cliente con su link de Google Maps
      const activeChat = await WhatsAppChat.findOne({
        "assignedDriver.phone": cleanPhone,
        status: "in_delivery",
      });

      if (activeChat) {
        activeChat.driverLiveLocationUrl = gmapsLiveUrl;
        await activeChat.save();

        await sendMetaWhatsAppMessage({
          to: activeChat.customerPhone,
          text: `📍 Ubicación en tiempo real de tu repartidor ${driver.name}:\n🗺️ ${gmapsLiveUrl}`,
        });
        return { success: true, action: "location_updated" };
      }
    }

    // 2. Conductor responde TOMAR
    if (upperText === "TOMAR" || upperText === "ACEPTAR" || upperText.includes("TOMO")) {
      // Buscar pedido en estado de convocatoria
      const chatToClaim = await WhatsAppChat.findOne({
        orderStage: "broadcasting_drivers",
        status: { $ne: "cancelled" },
      }).sort({ stageUpdatedAt: -1 });

      if (!chatToClaim) {
        await sendMetaWhatsAppMessage({
          to: cleanPhone,
          text: `⚠️ Esta carrera ya fue tomada por otro motorizado o no está disponible. ¡Mantente atento a la próxima alerta!`,
        });
        return { success: false, error: "Carrera ya tomada o no disponible" };
      }

      // Asignar el conductor al pedido
      chatToClaim.assignedDriver = {
        driverId: (driver._id as any).toString(),
        name: driver.name,
        phone: cleanPhone,
        vehicleType: driver.vehicleType,
        plate: driver.plate,
        assignedAt: new Date(),
      };
      chatToClaim.orderStage = "in_delivery";
      chatToClaim.status = "in_delivery";
      chatToClaim.lastMessage = `🛵 Conductor asignado: ${driver.name}`;
      chatToClaim.lastSender = "system";
      chatToClaim.stageUpdatedAt = new Date();
      await chatToClaim.save();

      // Bloquear al conductor a ocupado
      driver.status = "busy";
      driver.activeChatId = chatToClaim.chatId;
      driver.activeOrderId = chatToClaim.orderId;
      await driver.save();

      // Enviar hoja de ruta al Conductor con Google Maps del restaurante
      const driverDossier = `🛵 ¡CARRERA ASIGNADA CON ÉXITO! Ref: #${chatToClaim.orderId}

📍 1. RETIRO EN RESTAURANTE:
• Local: ${chatToClaim.restaurantName || "Restaurante Aliado"}
• Google Maps: ${chatToClaim.restaurantGoogleMapsUrl || "Solicitar en chat"}
• Dirección: ${chatToClaim.restaurantName || "Indicada en Google Maps"}

👤 2. ENTREGA A CLIENTE:
• Nombre: ${chatToClaim.customerName}
• WhatsApp Cliente: +${chatToClaim.customerPhone}
• Dirección Destino: ${chatToClaim.deliveryAddress}
• Total a cobrar: $${chatToClaim.totalAmount || 0}

------------------------------------------------
👉 Cuando entregues el pedido al cliente, responde *ENTREGADO* por este chat.`;

      await sendMetaWhatsAppMessage({
        to: cleanPhone,
        text: driverDossier,
      });

      // Enviar confirmación al Cliente con los datos del chofer y mapa del local
      const customerNotification = `🛵 ¡Tu motorizado va en camino!
• Repartidor: ${driver.name}
• Vehículo: ${driver.vehicleType.toUpperCase()} ${driver.plate ? `[${driver.plate}]` : ""}
• Teléfono directo: +${cleanPhone}
• Retirando en: ${chatToClaim.restaurantName} (${chatToClaim.restaurantGoogleMapsUrl || "Google Maps"})

Te avisaremos apenas tu conductor llegue a tu dirección de entrega.`;

      await sendMetaWhatsAppMessage({
        to: chatToClaim.customerPhone,
        text: customerNotification,
      });

      revalidatePath("/admin/whatsapp");
      return { success: true, action: "claimed" };
    }

    // 3. Conductor responde ENTREGADO
    if (upperText === "ENTREGADO" || upperText.includes("ENTREGUE")) {
      const activeDeliveryChat = await WhatsAppChat.findOne({
        "assignedDriver.phone": cleanPhone,
        status: "in_delivery",
      }).sort({ stageUpdatedAt: -1 });

      if (!activeDeliveryChat) {
        return { success: false, error: "No tienes entregas activas en este momento" };
      }

      activeDeliveryChat.orderStage = "driver_delivered";
      activeDeliveryChat.status = "delivered";
      activeDeliveryChat.lastMessage = `🛵 Conductor marcó ENTREGADO. Esperando confirmación de cliente.`;
      activeDeliveryChat.lastSender = "system";
      activeDeliveryChat.stageUpdatedAt = new Date();
      await activeDeliveryChat.save();

      // Notificar al chofer que espere la confirmación
      await sendMetaWhatsAppMessage({
        to: cleanPhone,
        text: `⏳ Hemos notificado al cliente ${activeDeliveryChat.customerName}. Tan pronto confirme la recepción, quedarás libre para nuevas carreras.`,
      });

      // Enviar solicitud de confirmación al Cliente
      await sendMetaWhatsAppMessage({
        to: activeDeliveryChat.customerPhone,
        text: `🛵 Tu conductor ${driver.name} reporta haber entregado tu pedido #${activeDeliveryChat.orderId}.

¿Recibiste todo en orden y conforme?
👉 Responde *SI* o *RECIBIDO* para confirmar y cerrar el servicio.`,
      });

      revalidatePath("/admin/whatsapp");
      return { success: true, action: "delivered" };
    }

    return { success: false, action: "none" };
  } catch (err: any) {
    console.error("Error al procesar mensaje de conductor:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 6. Procesa la confirmación final de recepción por parte del Cliente (Paso 6)
 */
export async function handleCustomerConfirmation(customerPhone: string, text: string) {
  await dbConnect();
  try {
    const cleanPhone = normalizeWhatsAppNumber(customerPhone);
    const upperText = text.trim().toUpperCase();

    if (upperText === "SI" || upperText === "RECIBIDO" || upperText.includes("CONFIRMO") || upperText.includes("TODO BIEN")) {
      const chat = await WhatsAppChat.findOne({
        chatId: cleanPhone,
        orderStage: "driver_delivered",
      }).sort({ stageUpdatedAt: -1 });

      if (!chat) return { success: false, action: "none" };

      // Cerrar orden formalmente
      chat.orderStage = "completed";
      chat.status = "closed";
      chat.lastMessage = `⭐ Pedido completado y confirmado por el cliente`;
      chat.lastSender = "system";
      chat.stageUpdatedAt = new Date();
      await chat.save();

      // Liberar al conductor y sumar carrera a sus estadísticas
      if (chat.assignedDriver?.driverId) {
        await Driver.findByIdAndUpdate(chat.assignedDriver.driverId, {
          status: "available",
          activeChatId: "",
          activeOrderId: "",
          $inc: { totalDeliveries: 1 },
        });

        // Felicitar al chofer
        await sendMetaWhatsAppMessage({
          to: chat.assignedDriver.phone,
          text: `✅ ¡Excelente trabajo ${chat.assignedDriver.name}! El cliente confirmó la entrega de la orden #${chat.orderId}. Has quedado DISPONIBLE en la cola para la próxima carrera.`,
        });
      }

      // Despedir amablemente al cliente
      await sendMetaWhatsAppMessage({
        to: cleanPhone,
        text: `⭐ ¡Muchas gracias por confirmar! Tu pedido ha sido cerrado con éxito. Esperamos que disfrutes tu comida. ¡Hasta tu próximo pedido en Venpide! 🛵🍔`,
      });

      revalidatePath("/admin/whatsapp");
      return { success: true, action: "completed" };
    }

    return { success: false, action: "none" };
  } catch (err: any) {
    console.error("Error al procesar confirmacion de cliente:", err);
    return { success: false, error: err.message };
  }
}
