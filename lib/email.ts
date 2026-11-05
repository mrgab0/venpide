import dbConnect from "@/lib/db";
import { SiteConfig } from "@/lib/models/SiteConfig";

export interface CorporateEmailConfig {
  senderFormatted: string;
  senderEmail: string;
  senderName: string;
  replyTo: string;
  resendApiKey: string;
  adminEmails: string[];
}

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
  tags?: Array<{ name: string; value: string }>;
}

export interface WrapTemplateOptions {
  title?: string;
  preheader?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  showContactFooter?: boolean;
}

/**
 * Obtiene la configuración oficial del remitente de Bonbon Flowers
 * Prioridad: Base de Datos (SiteConfig) > Variables de Entorno > Defaults de Marca
 */
export async function getCorporateEmailConfig(): Promise<CorporateEmailConfig> {
  let senderEmail = "pedidos@venpide.com";
  let senderName = "Venpide Delivery";
  let replyTo = "soporte@venpide.com";
  let resendApiKey = process.env.RESEND_API_KEY || "";
  let adminEmails: string[] = ["pedidos@venpide.com", "iirockalonso@gmail.com"];

  // Si SMTP_FROM o RESEND_FROM están definidos en variables de entorno, tomarlos
  const envFrom = process.env.RESEND_FROM || process.env.SMTP_FROM || "";
  if (envFrom) {
    const match = envFrom.match(/^(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)$/);
    if (match) {
      if (match[1]) senderName = match[1].trim();
      if (match[2]) {
        senderEmail = match[2].trim();
        replyTo = match[2].trim();
      }
    }
  }

  const rawEnvAdmins = process.env.ADMIN_EMAILS || "";
  if (rawEnvAdmins) {
    const parsed = rawEnvAdmins.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (parsed.length > 0) adminEmails = parsed;
  }

  try {
    await dbConnect();
    const config: any = await SiteConfig.findOne({ key: "global" }).lean();
    if (config) {
      if (config.corporateSenderEmail?.trim()) senderEmail = config.corporateSenderEmail.trim();
      if (config.corporateSenderName?.trim()) senderName = config.corporateSenderName.trim();
      if (config.corporateReplyToEmail?.trim()) replyTo = config.corporateReplyToEmail.trim();
      if (config.resendApiKey?.trim()) resendApiKey = config.resendApiKey.trim();
      if (Array.isArray(config.adminNotifyEmails) && config.adminNotifyEmails.length > 0) {
        adminEmails = config.adminNotifyEmails;
      }
    }
  } catch (err) {
    // Si MongoDB no está listo, se mantienen las variables de entorno
  }

  const senderFormatted = `"${senderName}" <${senderEmail}>`;

  return {
    senderFormatted,
    senderEmail,
    senderName,
    replyTo,
    resendApiKey,
    adminEmails,
  };
}

/**
 * Plantilla visual oficial de correos para Venpide Delivery
 * Diseñada con colores de marca: Esmeralda #059669, Fondo #12131A, Tipografía moderna
 */
export function wrapInBonbonEmailTemplate({
  title = "Venpide Delivery",
  preheader = "Tu pedido en camino • Delivery Rápido",
  bodyHtml,
  ctaText,
  ctaUrl,
  showContactFooter = true,
}: WrapTemplateOptions): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://venpide-gabriel-cavaneris-projects.vercel.app").replace(/\/$/, "");

  const ctaButtonHtml = ctaText && ctaUrl
    ? `
      <div style="margin: 28px 0 20px 0; text-align: center;">
        <a href="${ctaUrl}" target="_blank" style="background-color: #059669; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 9999px; font-weight: bold; font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase; display: inline-block; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);">
          ${ctaText} →
        </a>
      </div>
    `
    : "";

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
      <style>
        body { margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .email-container { max-width: 600px; margin: 20px auto; background-color: #FFFFFF; border-radius: 18px; overflow: hidden; border: 1px solid #EAEAEA; box-shadow: 0 10px 30px rgba(0,0,0,0.04); }
        @media only screen and (max-width: 620px) {
          .email-container { margin: 0 !important; width: 100% !important; border-radius: 0 !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 20px 10px; background-color: #F8F9FA;">
      <!-- Preheader para clientes de correo -->
      <div style="display: none; font-size: 1px; color: #F8F9FA; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        ${preheader}
      </div>

      <table role="presentation" class="email-container" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 18px; overflow: hidden; border: 1px solid #EAEAEA;">
        <!-- Cabecera Venpide Esmeralda & Dark -->
        <tr>
          <td style="background: linear-gradient(135deg, #059669 0%, #064E3B 100%); padding: 26px 30px; text-align: center; border-bottom: 2px solid #10B981;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="text-align: center;">
                  <h1 style="color: #FFFFFF; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.02em;">
                    🛵 Venpide
                  </h1>
                  <p style="color: #A7F3D0; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: bold;">
                    Delivery & Logística Express
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Contenido Principal -->
        <tr>
          <td style="padding: 32px 30px 24px 30px; color: #1A1A1A; line-height: 1.65; font-size: 14px;">
            ${bodyHtml}
            ${ctaButtonHtml}
          </td>
        </tr>

        <!-- Pie de Página Oficial -->
        ${
          showContactFooter
            ? `
          <tr>
            <td style="background-color: #12131A; color: #E6F7F0; padding: 24px 30px; text-align: center; font-size: 11px; border-top: 1px solid rgba(16, 185, 129, 0.2);">
              <p style="margin: 0 0 8px 0; font-weight: bold; color: #34D399; letter-spacing: 0.08em; text-transform: uppercase;">
                Venpide • Tu Ciudad al Instante
              </p>
              <p style="margin: 0 0 10px 0; color: #94A3B8; line-height: 1.4;">
                Central de Envíos & Despacho de Moto Taxi
              </p>
              <p style="margin: 0; color: #64748B; font-size: 10px;">
                © ${new Date().getFullYear()} Venpide. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        `
            : ""
        }
      </table>
    </body>
    </html>
  `;
}

/**
 * Enviar un correo electrónico utilizando la API oficial de Resend
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
  cc,
  bcc,
  attachments,
  tags,
}: SendMailOptions): Promise<{
  success: boolean;
  messageId?: string;
  sender?: string;
  error?: string;
}> {
  try {
    const config = await getCorporateEmailConfig();
    const apiKey = config.resendApiKey;

    if (!apiKey) {
      console.warn("[Resend Warning] RESEND_API_KEY no configurada. Simulando envío para entorno de pruebas.");
      return {
        success: true,
        messageId: `mock_resend_${Date.now()}`,
        sender: from || config.senderFormatted,
      };
    }

    const recipients = Array.isArray(to) ? to.map((e) => e.trim()).filter(Boolean) : [to.trim()];
    if (recipients.length === 0) {
      return { success: false, error: "No se proporcionó ningún destinatario." };
    }

    const fromAddress = from || config.senderFormatted;
    const replyToAddress = replyTo || config.replyTo;

    const payload: any = {
      from: fromAddress,
      to: recipients,
      reply_to: replyToAddress,
      subject: subject.trim(),
      html,
    };

    if (text) payload.text = text;
    if (cc) payload.cc = Array.isArray(cc) ? cc : [cc];
    if (bcc) payload.bcc = Array.isArray(bcc) ? bcc : [bcc];
    if (tags && tags.length > 0) payload.tags = tags;

    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map((att) => ({
        filename: att.filename,
        content: att.content
          ? typeof att.content === "string"
            ? att.content
            : att.content.toString("base64")
          : undefined,
        path: att.path,
      }));
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[Resend Error API]", data);
      throw new Error(data?.message || `Error en Resend (${res.status})`);
    }

    console.log(`[Resend OK] Enviado a ${recipients.join(", ")} | ID: ${data.id}`);
    return {
      success: true,
      messageId: data.id,
      sender: fromAddress,
    };
  } catch (error: any) {
    console.error("[Resend Exception]", error);
    return {
      success: false,
      error: error?.message || "Error al enviar correo con Resend",
    };
  }
}

/**
 * Enviar lote masivo de correos vía Resend Batch API (para Email Marketing)
 * Admite hasta 100 correos por bloque de llamada
 */
export async function sendBatchEmails(
  batchList: Array<{
    to: string[];
    subject: string;
    html: string;
    from?: string;
    replyTo?: string;
  }>
): Promise<{ success: boolean; sentCount: number; errors?: any[] }> {
  try {
    const config = await getCorporateEmailConfig();
    const apiKey = config.resendApiKey;

    if (!apiKey) {
      return { success: true, sentCount: batchList.length };
    }

    let sentTotal = 0;
    const errors: any[] = [];
    const chunkSize = 100;

    for (let i = 0; i < batchList.length; i += chunkSize) {
      const chunk = batchList.slice(i, i + chunkSize).map((item) => ({
        from: item.from || config.senderFormatted,
        to: item.to,
        reply_to: item.replyTo || config.replyTo,
        subject: item.subject,
        html: item.html,
      }));

      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });

      const resData = await res.json();
      if (res.ok && resData?.data) {
        sentTotal += resData.data.length;
      } else {
        errors.push(resData);
      }
    }

    return {
      success: errors.length === 0,
      sentCount: sentTotal,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err: any) {
    console.error("[Resend Batch Exception]", err);
    return { success: false, sentCount: 0, errors: [err.message] };
  }
}
