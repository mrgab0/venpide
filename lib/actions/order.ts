"use server";

import dbConnect from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { EmailMessage } from "@/lib/models/EmailMessage";
import { WhatsAppChat } from "@/lib/models/WhatsAppChat";
import { WhatsAppMessage } from "@/lib/models/WhatsAppMessage";
import { sendMetaWhatsAppMessage, normalizeWhatsAppNumber } from "@/lib/utils/metaWhatsApp";
import { verify2FACodeAction } from "@/lib/actions/admin2fa";
import {
  sendEmail,
  getCorporateEmailConfig,
  wrapInBonbonEmailTemplate,
} from "@/lib/email";
import { markCartAsRecoveredAction } from "@/lib/actions/abandonedCart";
import { revalidatePath } from "next/cache";

export async function createOrder(orderData: any, existingOrderId?: string) {
  await dbConnect();
  let savedOrder: any;
  let originalOrder: any = null;
  let isConsolidatedWithin2Hours = false;
  let minutesElapsed = 0;

  if (existingOrderId) {
    originalOrder = await Order.findOne({ orderId: existingOrderId });
    
    if (originalOrder && originalOrder.createdAt) {
      const diffMs = Date.now() - new Date(originalOrder.createdAt).getTime();
      minutesElapsed = Math.floor(diffMs / (1000 * 60));
      const hoursElapsed = diffMs / (1000 * 60 * 60);

      const statusLower = (originalOrder.status || "").toLowerCase();
      // Solo agrupar si han pasado menos de 2 horas Y el pedido no ha sido enviado aún
      const isNotDispatched = !statusLower.includes("camino") && !statusLower.includes("entregado") && !statusLower.includes("retirado");

      if (hoursElapsed <= 2 && isNotDispatched) {
        isConsolidatedWithin2Hours = true;
      }
    }
  }

  if (isConsolidatedWithin2Hours && originalOrder && existingOrderId) {
    const parts = existingOrderId.split('-');
    const baseId = `${parts[0]}-${parts[1]}`;
    const currentVersion = parseInt(parts[2]) || 1;
    const newVersion = currentVersion + 1;
    const newOrderId = `${baseId}-${newVersion}`;

    savedOrder = await Order.create({
      ...orderData,
      orderId: newOrderId,
      // Se guardan ÚNICAMENTE los ítems y total de ESTA nueva transacción (Factura Limpia)
      items: orderData.items,
      total: orderData.total,
      createdAt: new Date(),
    });
  }

  if (!savedOrder) {
    savedOrder = new Order({
      ...orderData,
      orderId: `VNP-${String(Math.floor(10000 + Math.random() * 90000))}-1`,
      items: orderData.items,
      total: orderData.total,
      createdAt: new Date(),
    });
    await savedOrder.save();
  }

  // Incrementar contador de uso de cupón si aplica
  if (orderData.couponCode) {
    try {
      const { Coupon } = await import("@/lib/models/Coupon");
      await Coupon.findOneAndUpdate(
        { code: orderData.couponCode.toUpperCase() },
        { $inc: { usedCount: 1 } }
      );
    } catch (err) {
      console.error("Error incrementando contador de uso de cupón:", err);
    }
  }

  // 1. Notificación Oficial de Pedido por Email vía Resend
  try {
    const emailCfg = await getCorporateEmailConfig();
    const recipients: string[] = [];

    if (savedOrder.customerEmail && savedOrder.customerEmail.trim()) {
      recipients.push(savedOrder.customerEmail.trim());
    }

    // Copia a administradores
    const bccAdmins = emailCfg.adminEmails.filter((adm) => !recipients.includes(adm));

    if (recipients.length > 0 || bccAdmins.length > 0) {
      const orderTotal = savedOrder.total || 0;
      const deliveryFee = savedOrder.deliveryFee || 0;
      const discountAmount = savedOrder.discountAmount || 0;
      const taxAmount = savedOrder.taxAmount || 0;
      const itemsSubtotal = (savedOrder.items || []).reduce(
        (acc: number, item: any) => acc + item.price * item.quantity,
        0
      );

      const cleanPhoneDigits = (savedOrder.customerPhone || "").replace(/\D/g, "");
      const waLink = cleanPhoneDigits
        ? `https://wa.me/${cleanPhoneDigits.length === 10 ? "1" + cleanPhoneDigits : cleanPhoneDigits}`
        : "https://wa.me/13467392730";

      const receiptBodyHtml = `
        <h2 style="color: #059669; font-size: 20px; margin-top: 0;">¡Comprobante de Pedido / Delivery! 🛵</h2>

        ${
          isConsolidatedWithin2Hours && originalOrder
            ? `
          <div style="margin-bottom: 20px; padding: 14px; background-color: #ECFDF5; border-left: 4px solid #059669; border-radius: 8px;">
            <strong style="color: #065F46; font-size: 13px;">📦 Nota de Envío Agrupado / Consolidado (< 2 horas):</strong><br>
            <span style="font-size: 12px; color: #1F2937; display: block; margin-top: 4px;">
              Esta compra fue realizada <strong>${minutesElapsed} min</strong> después de tu pedido previo (<strong>#${originalOrder.orderId}</strong>). Como tu primer pedido aún está en preparación en el local, nuestros motorizados agruparán ambos paquetes en la misma ruta de entrega.
            </span>
          </div>
        `
            : ""
        }

        <div style="background-color: #F8FAF9; padding: 16px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #E5E7EB;">
          <p style="margin: 4px 0;"><strong>ID Pedido:</strong> <span style="font-family: monospace; color: #059669; font-weight: bold;">${savedOrder.orderId}</span></p>
          <p style="margin: 4px 0;"><strong>Cliente:</strong> ${savedOrder.customerName}</p>
          <p style="margin: 4px 0;"><strong>Correo Electrónico:</strong> ${savedOrder.customerEmail || "No especificado"}</p>
          <p style="margin: 4px 0;"><strong>Teléfono / WhatsApp:</strong> ${savedOrder.customerPhone}</p>
          <p style="margin: 4px 0;"><strong>Opción de Entrega:</strong> ${savedOrder.deliveryMethod || orderData.deliveryMethod || "Envío a Domicilio"}</p>
          <p style="margin: 4px 0;"><strong>Dirección de Entrega:</strong> ${savedOrder.address}</p>
          ${savedOrder.distanceMiles ? `<p style="margin: 4px 0; color: #059669; font-weight: bold;"><strong>📍 Distancia de Entrega:</strong> ${savedOrder.distanceMiles} Millas</p>` : ""}

          ${
            savedOrder.cardMessage
              ? `
            <div style="margin-top: 12px; padding: 12px; background-color: #F0FDF4; border-left: 4px solid #10B981; border-radius: 6px;">
              <strong style="color: #065F46; font-size: 12px;">📝 Notas / Instrucciones de Entrega:</strong><br>
              <em style="color: #1F2937; font-size: 13px; display: block; margin-top: 4px;">"${savedOrder.cardMessage}"</em>
            </div>
          `
              : ""
          }

          ${
            savedOrder.googleMapsUrl
              ? `
            <div style="margin-top: 12px;">
              <a href="${savedOrder.googleMapsUrl}" target="_blank" style="background-color: #163422; color: #FFFFFF; padding: 10px 18px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 12px; display: inline-block;">
                🗺️ Abrir Ubicación en Google Maps (GPS)
              </a>
            </div>
          `
              : ""
          }
        </div>

        <h3 style="color: #163422; border-bottom: 2px solid #C5A059; padding-bottom: 6px; font-size: 15px;">Detalle de Productos & Adicionales:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          ${savedOrder.items
            .map(
              (item: any) => `
            <tr>
              <td style="padding: 10px 4px; border-bottom: 1px solid #EAEAEA;">
                <strong style="color: #163422;">${item.name}</strong><br>
                <small style="color: #64748B;">Cantidad: ${item.quantity}</small>
                ${
                  item.addons && item.addons.length > 0
                    ? `
                  <div style="margin-top: 6px; padding: 8px; background: #F8FAF9; border-left: 3px solid #163422; border-radius: 4px;">
                    <strong style="color: #163422; font-size: 11px;">Adicionales Seleccionados:</strong><br>
                    ${item.addons
                      .map(
                        (a: any) => `
                      <div style="font-size: 11px; margin-top: 2px; color: #374151;">
                        ✨ <strong>${a.name || a.value}</strong> ${a.price ? `(+$${a.price.toFixed(2)})` : ""}
                        ${a.customText ? `<div style="color: #163422; font-style: italic; font-weight: bold; margin-left: 8px;">💬 Dedicatoria: "${a.customText}"</div>` : ""}
                      </div>
                    `
                      )
                      .join("")}
                  </div>
                `
                    : ""
                }
              </td>
              <td style="padding: 10px 4px; border-bottom: 1px solid #EAEAEA; text-align: right; font-weight: bold; vertical-align: top; color: #163422;">
                $${(item.price * item.quantity).toFixed(2)} USD
              </td>
            </tr>
          `
            )
            .join("")}
        </table>

        <div style="background-color: #F8FAF9; padding: 16px; border-radius: 12px; margin-bottom: 20px; font-size: 13px; border: 1px solid #E5E7EB;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span>Subtotal Arreglos & Adicionales:</span>
            <strong>$${itemsSubtotal.toFixed(2)} USD</strong>
          </div>
          ${
            savedOrder.couponCode
              ? `
            <div style="display: flex; justify-content: space-between; color: #16A34A; margin-bottom: 6px;">
              <span>Descuento Cupón (${savedOrder.couponCode}):</span>
              <strong>-$${discountAmount.toFixed(2)} USD</strong>
            </div>
          `
              : ""
          }
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #163422;">
            <span>🏛️ Impuestos de Ley / Sales Tax (8.25%):</span>
            <strong>+$${taxAmount.toFixed(2)} USD</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span>Costo de Envío:</span>
            <strong style="color: #163422;">${deliveryFee > 0 ? `+$${deliveryFee.toFixed(2)} USD` : "Gratis / Incluido"}</strong>
          </div>
          <div style="border-top: 1px solid #D1D5DB; padding-top: 10px; margin-top: 10px; display: flex; justify-content: space-between; font-size: 16px;">
            <strong style="color: #163422;">TOTAL PAGADO:</strong>
            <strong style="color: #163422; font-size: 18px;">$${orderTotal.toFixed(2)} USD</strong>
          </div>
        </div>

        <div style="padding: 14px; background: #F8FAF9; border-radius: 10px; margin-bottom: 20px; font-size: 12px;">
          <p style="margin: 3px 0;"><strong>Método de Pago:</strong> ${savedOrder.paymentMethod}</p>
          <p style="margin: 3px 0;"><strong>Referencia de Transacción:</strong> ${savedOrder.paymentRef}</p>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${waLink}" target="_blank" style="background-color: #25D366; color: white; padding: 12px 26px; text-decoration: none; border-radius: 9999px; font-weight: bold; display: inline-block; font-size: 13px; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">
            Contactar por WhatsApp 💬
          </a>
        </div>
      `;

      const subject = `🛵 Confirmación de Pedido: #${savedOrder.orderId} • Venpide Delivery`;

      const wrappedHtml = wrapInBonbonEmailTemplate({
        title: subject,
        preheader: `Tu pedido #${savedOrder.orderId} por $${orderTotal.toFixed(2)} USD ha sido confirmado con éxito.`,
        bodyHtml: receiptBodyHtml,
        showContactFooter: true,
      });

      const sendTarget = recipients.length > 0 ? recipients : bccAdmins;
      const sendRes = await sendEmail({
        to: sendTarget,
        bcc: recipients.length > 0 && bccAdmins.length > 0 ? bccAdmins : undefined,
        subject,
        html: wrappedHtml,
        replyTo: emailCfg.replyTo,
      });

      // Registrar en EmailMessage para visualización en el Panel /admin/correos
      await EmailMessage.create({
        direction: "outbound",
        type: "order_receipt",
        from: sendRes.sender || emailCfg.senderFormatted,
        to: sendTarget,
        replyTo: emailCfg.replyTo,
        subject,
        bodyHtml: wrappedHtml,
        status: sendRes.success ? "sent" : "failed",
        isRead: true,
        customerName: savedOrder.customerName || "",
        customerPhone: savedOrder.customerPhone || "",
        customerEmail: savedOrder.customerEmail || "",
        orderId: savedOrder.orderId,
        resendMessageId: sendRes.messageId || "",
        bccAdmins: true,
        createdAt: new Date(),
      });

      console.log(`[Order Receipt] Notificación de orden ${savedOrder.orderId} enviada con éxito vía Resend.`);
    }
  } catch (emailError) {
    console.error("Error enviando recibo de orden vía Resend:", emailError);
  }

  // 2. Si vino de un carrito abandonado, marcarlo como recuperado
  if (orderData?.cartToken) {
    try {
      await markCartAsRecoveredAction(orderData.cartToken, savedOrder.orderId);
    } catch (cartErr) {
      console.error("Error marcando carrito como recuperado:", cartErr);
    }
  }

  // 3. Sincronización Automática con WhatsApp CRM & Notificación al Cliente
  try {
    if (savedOrder.customerPhone && savedOrder.customerPhone.trim()) {
      const normalizedPhone = normalizeWhatsAppNumber(savedOrder.customerPhone);

      const itemsSummary = (savedOrder.items || [])
        .map((it: any) => `${it.quantity}x ${it.title || it.name}`)
        .join(", ");

      const welcomeWaText = `🛵 ¡Hola ${savedOrder.customerName}! Tu pedido #${savedOrder.orderId} en Venpide ha sido confirmado.

📦 Productos: ${itemsSummary || "Artículos de entrega"}
💰 Total: $${Number(savedOrder.total || 0).toFixed(2)}
📍 Entrega: ${savedOrder.address || "Por coordinar"}

Estamos asignando a un conductor motorizado de nuestra flota para tu entrega. Cualquier instrucción adicional para el repartidor puedes responderla directamente por este chat de WhatsApp.`;

      // Buscar o crear conversación en CRM
      let chat = await WhatsAppChat.findOne({ chatId: normalizedPhone });
      if (!chat) {
        chat = new WhatsAppChat({
          chatId: normalizedPhone,
          customerName: savedOrder.customerName || "Cliente Venpide",
          customerPhone: normalizedPhone,
          orderId: savedOrder.orderId,
          restaurantName: savedOrder.restaurantName || "Venpide Comercios",
          deliveryAddress: savedOrder.address || "",
          totalAmount: savedOrder.total || 0,
          status: "open",
          lastMessage: `🛵 Nuevo pedido #${savedOrder.orderId}`,
          lastSender: "system",
          lastMessageAt: new Date(),
          unreadAdminCount: 1,
        });
      } else {
        chat.orderId = savedOrder.orderId;
        chat.customerName = savedOrder.customerName || chat.customerName;
        chat.deliveryAddress = savedOrder.address || chat.deliveryAddress;
        chat.totalAmount = savedOrder.total || chat.totalAmount;
        chat.status = "open";
        chat.lastMessage = `🛵 Nuevo pedido #${savedOrder.orderId}`;
        chat.lastSender = "system";
        chat.lastMessageAt = new Date();
        chat.unreadAdminCount = (chat.unreadAdminCount || 0) + 1;
      }
      await chat.save();

      // Guardar mensaje en el historial del chat
      await WhatsAppMessage.create({
        chatId: normalizedPhone,
        senderType: "system",
        senderName: "Sistema Venpide",
        text: welcomeWaText,
        status: "delivered",
        createdAt: new Date(),
      });

      // Disparar envío por Meta WhatsApp Cloud API (o simulación interna si no hay credenciales Meta)
      await sendMetaWhatsAppMessage({
        to: normalizedPhone,
        text: welcomeWaText,
      });

      revalidatePath("/admin/whatsapp");
      console.log(`[WhatsApp CRM] Orden ${savedOrder.orderId} sincronizada con el CRM y cliente notificado.`);
    }
  } catch (crmErr) {
    console.error("Error sincronizando orden con WhatsApp CRM:", crmErr);
  }

  return { success: true, orderId: savedOrder.orderId };
}

export async function getOrderById(orderIdOrPhone: string) {
  try {
    await dbConnect();
    const query = orderIdOrPhone.trim();

    const order = await Order.findOne({
      $or: [
        { orderId: query },
        { customerPhone: { $regex: query, $options: "i" } },
        { customerName: { $regex: query, $options: "i" } }
      ]
    }).lean();

    if (!order) {
      return { success: false, error: "Pedido no encontrado." };
    }

    return { success: true, data: JSON.parse(JSON.stringify(order)) };
  } catch (error) {
    console.error("Error al buscar pedido:", error);
    return { success: false, error: "Error al buscar el pedido." };
  }
}

export async function updateOrderStatusAction(orderId: string, status: string) {
  try {
    await dbConnect();
    const updated = await Order.findOneAndUpdate(
      { orderId },
      { status },
      { new: true }
    );
    if (!updated) {
      return { success: false, error: "Pedido no encontrado." };
    }
    return { success: true, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error) {
    console.error("Error actualizando estado del pedido:", error);
    return { success: false, error: "Error al actualizar el estado del pedido." };
  }
}

export async function updateOrderWith2FAAction(
  orderId: string,
  updateData: any,
  twoFactorCode: string
) {
  try {
    await dbConnect();

    // 1. Verificar 2FA
    const vRes = await verify2FACodeAction(twoFactorCode);
    if (!vRes.success) {
      return { success: false, error: vRes.error || "Código 2FA incorrecto." };
    }

    // 2. Actualizar datos de la orden
    const updated = await Order.findOneAndUpdate(
      { orderId },
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return { success: false, error: "No se encontró la orden a modificar." };
    }

    return { success: true, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    console.error("Error al actualizar la orden con 2FA:", error);
    return { success: false, error: "Error de servidor al guardar los cambios de la orden." };
  }
}

export async function getAllOrdersAction() {
  try {
    await dbConnect();
    const orders = await Order.find({}).sort({ createdAt: -1 }).limit(100).lean();
    return { success: true, data: JSON.parse(JSON.stringify(orders)) };
  } catch (error) {
    console.error("Error obteniendo lista de órdenes:", error);
    return { success: false, error: "No se pudieron obtener las órdenes." };
  }
}

