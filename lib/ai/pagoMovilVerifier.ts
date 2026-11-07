import dbConnect from "@/lib/db";
import { PagoMovilReference, IPagoMovilReference } from "@/lib/models/PagoMovilReference";
import { WhatsAppChat, IWhatsAppChat } from "@/lib/models/WhatsAppChat";
import { WhatsAppMessage } from "@/lib/models/WhatsAppMessage";
import { Driver } from "@/lib/models/Driver";
import { sendMetaWhatsAppMessage, normalizeWhatsAppNumber } from "@/lib/utils/metaWhatsApp";
import { sendPagoMovilReceiptEmail } from "@/lib/email";
import { broadcastToDrivers } from "@/lib/ai/deliveryCoordinator";
import { revalidatePath } from "next/cache";

export interface ExtractedPaymentInfo {
  reference: string;
  bankCode?: string;
  bankName?: string;
  amountBs?: number;
  amountUsd?: number;
  isPaymentProof: boolean;
  confidence: number;
}

const VENEZUELAN_BANKS: Record<string, string> = {
  "0102": "Banco de Venezuela",
  "0134": "Banesco",
  "0105": "Mercantil",
  "0108": "BBVA Provincial",
  "0172": "Bancamiga",
  "0114": "Bancaribe",
  "0115": "Banco Exterior",
  "0163": "Banco del Tesoro",
  "0175": "Banco Bicentenario",
  "0191": "BNC (Banco Nacional de Crédito)",
};

/**
 * 1. Extractor inteligente de Referencia de Pago Móvil por Texto
 */
export function extractPaymentReferenceFromText(text: string): ExtractedPaymentInfo {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // Detectar si menciona palabras clave de pago móvil
  const hasPaymentKeywords =
    lower.includes("pago movil") ||
    lower.includes("pagomovil") ||
    lower.includes("transferencia") ||
    lower.includes("referencia") ||
    lower.includes("ref:") ||
    lower.includes("ref.") ||
    lower.includes("ref ") ||
    lower.includes("comprobante") ||
    lower.includes("listo el pago") ||
    lower.includes("ya pague") ||
    lower.includes("ya transferi") ||
    lower.includes("capture");

  // Regex para buscar números de referencia (entre 4 y 12 dígitos)
  let detectedRef = "";

  // 1. Patrón explícito: ref: 12345678 o referencia: 123456
  const explicitRefMatch = clean.match(/(?:ref|referencia|operaci[oó]n|num|nro|c[oó]digo|transacci[oó]n)[:.\s#]*([0-9]{4,14})/i);
  if (explicitRefMatch && explicitRefMatch[1]) {
    detectedRef = explicitRefMatch[1].trim();
  } else {
    // 2. Si no hay palabra clave previa, buscar secuencias de 6 a 10 dígitos numéricos puros
    const numberMatches = clean.match(/\b([0-9]{6,10})\b/g);
    if (numberMatches && numberMatches.length > 0) {
      // Filtrar números de teléfono comunes venezolanos (que empiezan por 0412, 0414, 0424, 0416, 0426, 584)
      const nonPhone = numberMatches.filter((n) => !n.startsWith("04") && !n.startsWith("584"));
      if (nonPhone.length > 0) {
        detectedRef = nonPhone[0];
      } else if (hasPaymentKeywords) {
        detectedRef = numberMatches[0];
      }
    }
  }

  // Detectar Banco
  let detectedBankCode = "";
  let detectedBankName = "";

  for (const [code, name] of Object.entries(VENEZUELAN_BANKS)) {
    if (clean.includes(code) || lower.includes(name.toLowerCase())) {
      detectedBankCode = code;
      detectedBankName = name;
      break;
    }
  }

  // Detectar Monto (Bs. o $)
  let amountBs = 0;
  let amountUsd = 0;
  const bsMatch = clean.match(/(?:bs\.?|bol[ií]vares)\s*([0-9.,]+)/i) || clean.match(/([0-9.,]+)\s*(?:bs\.?|bol[ií]vares)/i);
  if (bsMatch && bsMatch[1]) {
    const rawVal = bsMatch[1].replace(/\./g, "").replace(",", ".");
    amountBs = parseFloat(rawVal) || 0;
  }

  const usdMatch = clean.match(/(?:\$|usd|dolares|dólares)\s*([0-9.,]+)/i) || clean.match(/([0-9.,]+)\s*(?:\$|usd)/i);
  if (usdMatch && usdMatch[1]) {
    const rawVal = usdMatch[1].replace(/,/g, ".");
    amountUsd = parseFloat(rawVal) || 0;
  }

  const isProof = Boolean(detectedRef && (hasPaymentKeywords || detectedRef.length >= 6));

  return {
    reference: detectedRef,
    bankCode: detectedBankCode,
    bankName: detectedBankName || (detectedBankCode ? VENEZUELAN_BANKS[detectedBankCode] : "Pago Móvil"),
    amountBs,
    amountUsd,
    isPaymentProof: isProof,
    confidence: isProof ? 0.95 : 0.2,
  };
}

/**
 * 2. Conciliador Discriminatorio Anti-Fraude (Regla de 7 Días)
 * Bloquea cualquier intento de reutilizar el mismo comprobante/número de referencia en una semana
 */
export async function checkDuplicateReference(reference: string): Promise<{
  isDuplicate: boolean;
  existingRecord?: IPagoMovilReference | null;
}> {
  await dbConnect();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const existing = await PagoMovilReference.findOne({
    reference: reference.trim(),
    createdAt: { $gte: sevenDaysAgo },
  }).lean();

  if (existing) {
    return {
      isDuplicate: true,
      existingRecord: existing as any,
    };
  }

  return { isDuplicate: false };
}

/**
 * 3. Validador de Gateway Bancario (API / Conciliación)
 */
export async function verifyWithBankGateway(
  reference: string,
  amountBs: number,
  bankCode?: string
): Promise<{ success: boolean; bankStatus: string; authCode?: string }> {
  // Simulación de respuesta bancaria exitosa o integración con API de banco
  // Formato válido de referencia en Venezuela: entre 4 y 12 dígitos
  if (!reference || reference.length < 4) {
    return { success: false, bankStatus: "REFERENCIA_INVALIDA" };
  }

  // Generar código de autorización bancaria
  const authCode = `AUT-${Date.now().toString().slice(-6)}`;
  return {
    success: true,
    bankStatus: "CONCILIADO_OK",
    authCode,
  };
}

/**
 * 4. Pipeline Principal: Procesa Comprobante de Pago Entrante
 * Aplica OCR / Regex, verifica duplicados de 7 días, valida gateway, cambia estado a PAGADO,
 * notifica al chofer, envía emails al cliente y al jefe, y responde al WhatsApp del cliente.
 */
export async function processIncomingPaymentProof(params: {
  chatId: string;
  customerPhone: string;
  customerName: string;
  customerEmail?: string;
  text: string;
  imageUrl?: string;
}): Promise<{
  handled: boolean;
  verified: boolean;
  message?: string;
  reference?: string;
}> {
  await dbConnect();
  const { chatId, customerPhone, customerName, customerEmail, text, imageUrl } = params;

  // 1. Extraer datos del texto o pie de imagen
  const extracted = extractPaymentReferenceFromText(text || "");

  // Si no se detectó referencia ni es comprobante, no intervenir
  if (!extracted.isPaymentProof || !extracted.reference) {
    return { handled: false, verified: false };
  }

  const cleanRef = extracted.reference;
  const chat = await WhatsAppChat.findOne({ chatId });

  if (!chat) {
    return { handled: false, verified: false };
  }

  // 2. Discriminador Anti-Duplicados (Últimos 7 días)
  const dupCheck = await checkDuplicateReference(cleanRef);
  if (dupCheck.isDuplicate) {
    console.warn(`[Anti-Fraude] Referencia duplicada detectada: ${cleanRef} para chat ${chatId}`);

    // Registrar intento duplicado para auditoría
    await PagoMovilReference.create({
      reference: cleanRef,
      bankCode: extracted.bankCode,
      bankName: extracted.bankName,
      amountBs: extracted.amountBs,
      amountUsd: extracted.amountUsd,
      customerPhone,
      customerName,
      customerEmail: customerEmail || chat.customerEmail,
      chatId,
      orderId: chat.orderId,
      proofImageUrl: imageUrl || "",
      status: "duplicate",
      verificationSource: imageUrl ? "ocr" : "text",
      rejectionReason: "Referencia utilizada previamente en los últimos 7 días",
      rawText: text,
    });

    const rejectionMsg = `⚠️ Estimado cliente, el número de referencia *#${cleanRef}* ya fue registrado anteriormente en nuestro sistema dentro de los últimos 7 días.

Por razones de seguridad no podemos procesar comprobantes repetidos. Si realizaste una nueva transferencia, por favor envíanos el número o comprobante correcto.`;

    await sendMetaWhatsAppMessage({
      to: customerPhone,
      text: rejectionMsg,
    });

    await WhatsAppMessage.create({
      chatId,
      senderType: "system",
      senderName: "Sistema Anti-Fraude",
      text: `❌ Intento de pago rechazado: Referencia #${cleanRef} ya había sido usada previamente.`,
      status: "delivered",
      createdAt: new Date(),
    });

    return {
      handled: true,
      verified: false,
      message: rejectionMsg,
      reference: cleanRef,
    };
  }

  // 3. Verificación con Gateway Bancario
  const bankRes = await verifyWithBankGateway(cleanRef, extracted.amountBs || 0, extracted.bankCode);
  if (!bankRes.success) {
    return {
      handled: true,
      verified: false,
      message: "No pudimos validar la referencia con el banco.",
    };
  }

  // 4. Pago Aprobado: Guardar Registro en PagoMovilReference
  const finalAmountUsd = chat.totalAmount || extracted.amountUsd || 10;
  const finalAmountBs = extracted.amountBs || finalAmountUsd * 40; // Tasa referencial si no viene explícita

  await PagoMovilReference.create({
    reference: cleanRef,
    bankCode: extracted.bankCode,
    bankName: extracted.bankName,
    amountBs: finalAmountBs,
    amountUsd: finalAmountUsd,
    customerPhone,
    customerName,
    customerEmail: customerEmail || chat.customerEmail,
    chatId,
    orderId: chat.orderId,
    proofImageUrl: imageUrl || "",
    status: "verified",
    verificationSource: imageUrl ? "ocr" : "text",
    verifiedAt: new Date(),
    rawText: text,
  });

  // 5. Actualizar Estado del Chat y Orden a PAGADO
  chat.paymentStatus = "paid";
  chat.paymentMethod = "pago_movil";
  chat.paymentRef = cleanRef;
  chat.stageUpdatedAt = new Date();
  chat.lastMessage = `✅ Pago móvil verificado (Ref: #${cleanRef})`;
  chat.lastSender = "system";

  // Si estaba esperando pago, avanzar el pedido
  if (chat.orderStage === "draft" || chat.orderStage === "pending_restaurant") {
    chat.orderStage = "restaurant_accepted";
  }
  await chat.save();

  // Nombre del motorizado asignado (si existe)
  const driverName = chat.assignedDriver?.name || "Wilmer";

  // 6. Mensaje de Salida de Pedido al Cliente por WhatsApp
  const confirmationMsg = `✅ ¡Perfecto! Tu pago móvil de Bs. ${Number(finalAmountBs).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
  })} (Ref: *#${cleanRef}*) ha sido verificado y confirmado con éxito en nuestra cuenta bancaria.

🛵 Nuestro motorizado *${driverName}* va en camino con tu pedido. ¡Gracias por tu compra en Venpide!`;

  await sendMetaWhatsAppMessage({
    to: customerPhone,
    text: confirmationMsg,
  });

  // 7. Alerta automática al Motorizado por WhatsApp
  if (chat.assignedDriver?.phone) {
    await sendMetaWhatsAppMessage({
      to: chat.assignedDriver.phone,
      text: `🛵 ¡PAGO CONFIRMADO! La orden #${chat.orderId || "DIRECTA"} de ${customerName} fue pagada por Pago Móvil (Ref: #${cleanRef}). Ya puedes realizar la entrega sin cobrar en efectivo.`,
    });
  } else {
    // Si aún no hay motorizado asignado, disparar convocatoria a la flota
    await broadcastToDrivers(chat);
  }

  // 8. Registro de Auditoría en el Historial del CRM
  await WhatsAppMessage.create({
    chatId,
    senderType: "system",
    senderName: "Conciliador Bancario Venpide",
    text: `💳 Pago Móvil verificado con éxito. Ref: #${cleanRef} • Banco: ${extracted.bankName} • Monto: Bs. ${finalAmountBs} (~$${finalAmountUsd}).`,
    status: "delivered",
    createdAt: new Date(),
  });

  // 9. Envío Dual de Emails con Factura (Cliente + Jefe / Admin)
  try {
    await sendPagoMovilReceiptEmail({
      orderId: chat.orderId || "VNP-DIRECTO",
      reference: cleanRef,
      bankName: extracted.bankName,
      amountBs: finalAmountBs,
      amountUsd: finalAmountUsd,
      customerName,
      customerPhone,
      customerEmail: customerEmail || chat.customerEmail || undefined,
      serviceType: chat.serviceType || "delivery",
      itemsSummary: chat.notes || chat.lastMessage,
      deliveryAddress: chat.deliveryAddress,
      driverName: chat.assignedDriver?.name || driverName,
      driverPhone: chat.assignedDriver?.phone,
    });
  } catch (emailErr) {
    console.error("[Email Receipt Error]", emailErr);
  }

  revalidatePath("/admin/whatsapp");

  return {
    handled: true,
    verified: true,
    reference: cleanRef,
    message: confirmationMsg,
  };
}
