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

/**
 * 7. Embudo Multimodular Conversacional
 * Saludo personalizado (nuevo vs recurrente), selección de 4 servicios (traslado, delivery,
 * mandaito, flete), captura de detalles y selección de método de pago (Pago Móvil vs Efectivo).
 */
export async function handleCustomerFunnelMessage(
  chat: IWhatsAppChat,
  text: string
): Promise<{ handled: boolean; replyText?: string }> {
  await dbConnect();
  try {
    const clean = text.trim();
    const lower = clean.toLowerCase();
    const cleanPhone = normalizeWhatsAppNumber(chat.customerPhone);

    // Detectar si el cliente es recurrente en la base de datos
    const messageCount = await WhatsAppMessage.countDocuments({ chatId: chat.chatId });
    const isRecurring = messageCount > 2;

    const currentStep = chat.conversationStep || "greeting";

    // -------------------------------------------------------------------------
    // PASO 1: SALUDO Y ELECCIÓN DE SERVICIO
    // -------------------------------------------------------------------------
    const isGreeting =
      lower.startsWith("hola") ||
      lower.startsWith("buenas") ||
      lower.startsWith("buenos") ||
      lower.startsWith("que tal") ||
      lower.startsWith("saludos") ||
      lower === "epale" ||
      lower === "buenas tardes" ||
      lower === "buenos dias" ||
      lower === "buenas noches";

    // Detección de servicios por sinónimos
    const isTraslado =
      lower.includes("traslado") ||
      lower.includes("carrera") ||
      lower.includes("mototaxi") ||
      lower.includes("carrerita") ||
      lower.includes("taxi") ||
      lower.includes("llevarme") ||
      lower.includes("cola") ||
      lower === "1";

    const isDelivery =
      lower.includes("delivery") ||
      lower.includes("comida") ||
      lower.includes("hamburguesa") ||
      lower.includes("pizza") ||
      lower.includes("pollo") ||
      lower.includes("comer") ||
      lower.includes("almuerzo") ||
      lower.includes("cena") ||
      lower.includes("restaurante") ||
      lower.includes("mcdonalds") ||
      lower.includes("kfc") ||
      lower === "2";

    const isMandaito =
      lower.includes("mandaito") ||
      lower.includes("mandado") ||
      lower.includes("encomienda") ||
      lower.includes("paquete") ||
      lower.includes("favor") ||
      lower.includes("diligencia") ||
      lower.includes("llaves") ||
      lower === "3";

    const isFlete =
      lower.includes("flete") ||
      lower.includes("mudanza") ||
      lower.includes("carga") ||
      lower.includes("camioneta") ||
      lower.includes("camion") ||
      lower.includes("bultos") ||
      lower.includes("nevera") ||
      lower === "4";

    if (currentStep === "greeting" || (isGreeting && !chat.serviceType)) {
      if (isTraslado || isDelivery || isMandaito || isFlete) {
        // El cliente saludó y de una vez indicó el servicio
        const selected = isTraslado ? "traslado" : isDelivery ? "delivery" : isMandaito ? "mandaito" : "flete";
        chat.serviceType = selected;
        chat.conversationStep = "awaiting_details";
        await chat.save();

        let promptDetails = "";
        if (selected === "delivery") {
          promptDetails = `🍔 ¡Excelente, servicio de *Delivery*!\n¿De cuál restaurante o local quieres pedir y qué te gustaría ordenar? (Ej. McDonald's, Burger House, una pizza...)`;
        } else if (selected === "traslado") {
          promptDetails = `🏍️ ¡Perfecto, servicio de *Traslado*!\n¿En qué dirección o punto exacto te encuentras y hacia dónde te trasladamos?`;
        } else if (selected === "mandaito") {
          promptDetails = `📦 ¡Listo, servicio de *Mandaito*!\n¿Qué encomienda o diligencia necesitas que retiremos, en qué dirección y a dónde la entregamos?`;
        } else {
          promptDetails = `🚚 ¡Entendido, servicio de *Flete*!\n¿Qué tipo de carga o bultos necesitas transportar y de qué punto a qué punto?`;
        }

        await sendMetaWhatsAppMessage({ to: cleanPhone, text: promptDetails });
        return { handled: true, replyText: promptDetails };
      }

      // Saludo formal con menú de opciones
      const welcomeHeader = isRecurring
        ? `¡Hola! Espero estés bien. Qué gusto saludarte de nuevo en *Venpide* 🛵`
        : `¡Bienvenido a *Venpide*! 🇻🇪 Tu central de pedidos, encomiendas y traslados rápidos.`;

      const menuText = `${welcomeHeader}

¿En qué te podemos ayudar el día de hoy?
🛵 *1. Traslado* (Moto Taxi / Carro)
🍔 *2. Delivery* (Comida y Restaurantes)
📦 *3. Mandaito* (Diligencias / Encomiendas)
🚚 *4. Flete* (Carga pesada / Camioneta)

👉 Responde con el número o nombre del servicio.`;

      chat.conversationStep = "awaiting_service";
      await chat.save();

      await sendMetaWhatsAppMessage({ to: cleanPhone, text: menuText });
      return { handled: true, replyText: menuText };
    }

    // -------------------------------------------------------------------------
    // PASO 2: SELECCIÓN DEL SERVICIO
    // -------------------------------------------------------------------------
    if (currentStep === "awaiting_service") {
      let selected: "delivery" | "traslado" | "mandaito" | "flete" = "delivery";
      if (isTraslado) selected = "traslado";
      else if (isDelivery) selected = "delivery";
      else if (isMandaito) selected = "mandaito";
      else if (isFlete) selected = "flete";

      chat.serviceType = selected;
      chat.conversationStep = "awaiting_details";
      await chat.save();

      let promptDetails = "";
      if (selected === "delivery") {
        promptDetails = `🍔 ¡Excelente, servicio de *Delivery*!\n¿De cuál restaurante o local quieres pedir y qué te gustaría ordenar? (Ej. McDonald's, Burger House, una pizza...)`;
      } else if (selected === "traslado") {
        promptDetails = `🏍️ ¡Perfecto, servicio de *Traslado*!\n¿En qué dirección o punto exacto te encuentras y hacia dónde te trasladamos?`;
      } else if (selected === "mandaito") {
        promptDetails = `📦 ¡Listo, servicio de *Mandaito*!\n¿Qué encomienda o diligencia necesitas que retiremos, en qué dirección y a dónde la entregamos?`;
      } else {
        promptDetails = `🚚 ¡Entendido, servicio de *Flete*!\n¿Qué tipo de carga o bultos necesitas transportar y de qué punto a qué punto?`;
      }

      await sendMetaWhatsAppMessage({ to: cleanPhone, text: promptDetails });
      return { handled: true, replyText: promptDetails };
    }

    // -------------------------------------------------------------------------
    // PASO 3: CAPTURA DE DETALLES Y PREGUNTA POR MÉTODO DE PAGO
    // -------------------------------------------------------------------------
    if (currentStep === "awaiting_details") {
      chat.notes = clean;
      chat.lastMessage = clean;

      // Si es delivery, intentar mapear restaurante
      if (chat.serviceType === "delivery") {
        const parsed = await parseCustomerOrder(clean, chat);
        if (parsed.restaurant) {
          chat.restaurantName = parsed.restaurant.name;
          chat.restaurantPhone = parsed.restaurant.phone;
          chat.restaurantGoogleMapsUrl = parsed.restaurant.googleMapsUrl;
        }
        if (parsed.deliveryAddress) {
          chat.deliveryAddress = parsed.deliveryAddress;
        }
      } else {
        chat.deliveryAddress = clean;
      }

      chat.conversationStep = "awaiting_payment_method";
      await chat.save();

      const paymentPrompt = `Anotado tu requerimiento. ✅

Para coordinar el despacho inmediato, ¿cómo deseas realizar tu pago?

👉 Responde *1* o *PAGO MOVIL*
👉 Responde *2* o *EFECTIVO* ($ o Bs al recibir)`;

      await sendMetaWhatsAppMessage({ to: cleanPhone, text: paymentPrompt });
      return { handled: true, replyText: paymentPrompt };
    }

    // -------------------------------------------------------------------------
    // PASO 4: ELECCIÓN DEL MÉTODO DE PAGO
    // -------------------------------------------------------------------------
    if (currentStep === "awaiting_payment_method") {
      const isPagoMovil = lower === "1" || lower.includes("pago movil") || lower.includes("pagomovil") || lower.includes("transferencia");
      const isEfectivo = lower === "2" || lower.includes("efectivo") || lower.includes("cash") || lower.includes("dolares") || lower.includes("dólares");

      if (isPagoMovil) {
        chat.paymentMethod = "pago_movil";
        chat.conversationStep = "awaiting_payment_proof";
        await chat.save();

        const totalUsd = chat.totalAmount || 10;
        const totalBs = totalUsd * 40;

        const bankInstructions = `💳 *Datos oficiales para Pago Móvil Venpide:*
• Banco: *Banesco (0134)* o *BDV (0102)*
• Teléfono: *0412-1234567*
• C.I.: *V-25.123.456*
• Monto a pagar: *$${totalUsd} USD* (~Bs. ${totalBs.toLocaleString("es-VE")})

------------------------------------------------
👉 Una vez realizada la transferencia, envíanos por aquí el *número de referencia completo* o la *captura de pantalla* para verificarla automáticamente.`;

        await sendMetaWhatsAppMessage({ to: cleanPhone, text: bankInstructions });
        return { handled: true, replyText: bankInstructions };
      }

      if (isEfectivo) {
        chat.paymentMethod = "efectivo";
        chat.paymentStatus = "pending_verification";
        chat.conversationStep = "dispatching";
        chat.orderStage = chat.serviceType === "delivery" ? "pending_restaurant" : "broadcasting_drivers";
        await chat.save();

        const driverName = chat.assignedDriver?.name || "Wilmer";

        const cashConfirmation = `✅ ¡Anotado pago en Efectivo!

Tu pedido ha sido procesado. Nuestro motorizado *${driverName}* va en camino para atender tu servicio. 🛵
Por favor ten a la mano el monto acordado ($ o Bs al cambio del día). Te avisaremos al llegar.`;

        await sendMetaWhatsAppMessage({ to: cleanPhone, text: cashConfirmation });

        // Si es delivery, notificar a restaurante
        if (chat.serviceType === "delivery" && chat.restaurantPhone) {
          await notifyRestaurantForAcceptance(chat);
        } else {
          await broadcastToDrivers(chat);
        }

        return { handled: true, replyText: cashConfirmation };
      }
    }

    return { handled: false };
  } catch (err: any) {
    console.error("Error en handleCustomerFunnelMessage:", err);
    return { handled: false };
  }
}

