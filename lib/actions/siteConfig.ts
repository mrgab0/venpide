"use server";

import dbConnect from "@/lib/db";
import { SiteConfig } from "@/lib/models/SiteConfig";
import { revalidatePath } from "next/cache";

const DEFAULT_SITE_CONFIG = {
  key: "global",
  heroTitle: "Venpide | Delivery de Restaurantes & Logística",
  heroSlogan: "Pide de tus restaurantes y establecimientos favoritos con envíos express en moto taxi.",
  heroButtonText: "Pedir Ahora",
  footerTitle: "Venpide",
  footerSlogan: "Plataforma de Delivery, Restaurantes & Moto Taxi",
  footerCopyright: "© 2026 Venpide. Todos los derechos reservados.",
  productColumnsDesktop: 3,
  productColumnsMobile: 2,
  heroProductMode: "popular",
  heroProductId: "",
  heroPopularCount: 10,
  heroCustomProductIds: [],
  logoUrl: "/logo.png",
  brandSlogan: "Delivery Express & Moto Taxi",
  menuHomeLabel: "Inicio",
  menuCatalogLabel: "Restaurantes & Menús",
  menuTrackingLabel: "🛵 Rastreo de Envíos",
  menuAboutLabel: "Nosotros",
  menuContactLabel: "Contacto",
  primaryColor: "#E11D48",
  enableHeaderSocials: true,
  facebookUrl: "https://www.facebook.com/venpide",
  instagramUrl: "https://www.instagram.com/venpide",
  tiktokUrl: "https://tiktok.com/@venpide",
  whatsappUrl: "https://wa.me/584120000000",
  enableSocialFeed: true,
  socialFeedTitle: "Síguenos en Instagram @venpide 🛵",
  socialEmbedHtml: "",
  enableReviewsSection: true,
  reviewsTitle: "Lo que opinan nuestros clientes y comercios ⭐⭐⭐⭐⭐",
  reviewsRatingScore: "4.9 / 5.0",
  reviewsCountText: "+500 Entregas Exitosas",
  trustpilotWidgetHtml: "",
  enableCustomIframe: false,
  customIframeTitle: "Comercios Destacados",
  customIframeHtml: "",
  enableChatbot: true,
  chatbotMiniMode: true,
  chatbotInitialPosition: "bottom-right",
  geminiApiKey: "",
  dialogflowAgentId: "",
  dialogflowProjectId: "",
  dialogflowLocation: "us-central1",
  dialogflowLanguageCode: "es",
  dialogflowChatTitle: "Asistente Venpide 🛵",
  metaWhatsAppConfig: {
    phoneNumberId: "",
    wabaId: "",
    accessToken: "",
    verifyToken: "venpide_webhook_token_2026",
    webhookUrl: "/api/webhook/whatsapp",
    autoForwardToDriver: true,
    autoForwardToCustomer: true,
  }
};

export async function getSiteConfig() {
  await dbConnect();
  try {
    // Sincronizar y activar TOTP con el secreto permanente registrado en authenticator
    const currentTotpSecret = "P6K6MY2PKEUJ7KUJLBLTQ64UEC5REGO6";
    let config: any = await SiteConfig.findOne({ key: "global" }).lean();
    if (!config) {
      config = await SiteConfig.create({
        ...DEFAULT_SITE_CONFIG,
        twoFactorMode: "totp",
        twoFactorSecret: currentTotpSecret
      });
    } else if (config.twoFactorMode !== "totp" || config.twoFactorSecret !== currentTotpSecret) {
      await SiteConfig.updateOne(
        { key: "global" },
        {
          $set: {
            twoFactorMode: "totp",
            twoFactorSecret: currentTotpSecret
          }
        }
      );
      config.twoFactorMode = "totp";
      config.twoFactorSecret = currentTotpSecret;
    }
    return { success: true, data: JSON.parse(JSON.stringify(config)) };
  } catch (error) {
    console.error("Error al obtener configuración del sitio:", error);
    return { success: true, data: DEFAULT_SITE_CONFIG };
  }
}

export async function updateSiteConfig(formData: FormData) {
  await dbConnect();
  try {
    const existing = await SiteConfig.findOne({ key: "global" }).lean();
    const prev = (existing as any) || DEFAULT_SITE_CONFIG;

    const getValue = (key: string, fallback: any) => {
      const val = formData.get(key);
      if (val !== null && val !== undefined) return val as string;
      return prev[key as keyof typeof prev] ?? fallback;
    };

    const getBool = (key: string, fallback: boolean) => {
      if (formData.has(key)) {
        return formData.get(key) === "true";
      }
      return prev[key as keyof typeof prev] !== undefined ? Boolean(prev[key as keyof typeof prev]) : fallback;
    };

    const heroTitle = getValue("heroTitle", DEFAULT_SITE_CONFIG.heroTitle);
    const heroSlogan = getValue("heroSlogan", DEFAULT_SITE_CONFIG.heroSlogan);
    const heroButtonText = getValue("heroButtonText", DEFAULT_SITE_CONFIG.heroButtonText);
    const footerTitle = getValue("footerTitle", DEFAULT_SITE_CONFIG.footerTitle);
    const footerSlogan = getValue("footerSlogan", DEFAULT_SITE_CONFIG.footerSlogan);
    const footerCopyright = getValue("footerCopyright", DEFAULT_SITE_CONFIG.footerCopyright);

    // Campos de Cuadrícula de Productos
    const productColumnsDesktop = formData.has("productColumnsDesktop")
      ? (parseInt(formData.get("productColumnsDesktop") as string) || 3)
      : (prev.productColumnsDesktop || 3);

    const productColumnsMobile = formData.has("productColumnsMobile")
      ? (parseInt(formData.get("productColumnsMobile") as string) || 2)
      : (prev.productColumnsMobile || 2);

    // Configuración del Producto Destacado Hero
    const heroProductMode = getValue("heroProductMode", DEFAULT_SITE_CONFIG.heroProductMode || "popular");
    const heroProductId = getValue("heroProductId", "");
    const heroPopularCount = formData.has("heroPopularCount")
      ? (parseInt(formData.get("heroPopularCount") as string) || 10)
      : (prev.heroPopularCount || 10);

    let heroCustomProductIds: string[] = prev.heroCustomProductIds || [];
    if (formData.has("heroCustomProductIds")) {
      const rawCustom = formData.get("heroCustomProductIds");
      if (typeof rawCustom === "string") {
        try {
          const parsed = JSON.parse(rawCustom);
          if (Array.isArray(parsed)) {
            heroCustomProductIds = parsed;
          }
        } catch {
          heroCustomProductIds = formData.getAll("heroCustomProductIds").map(String).filter(Boolean);
        }
      }
    }

    // Identidad y Menú
    const logoUrl = getValue("logoUrl", "https://bonbonflowershouston.com/logo.png");
    const brandSlogan = getValue("brandSlogan", DEFAULT_SITE_CONFIG.brandSlogan);
    const menuHomeLabel = getValue("menuHomeLabel", DEFAULT_SITE_CONFIG.menuHomeLabel);
    const menuCatalogLabel = getValue("menuCatalogLabel", DEFAULT_SITE_CONFIG.menuCatalogLabel);
    const menuTrackingLabel = getValue("menuTrackingLabel", DEFAULT_SITE_CONFIG.menuTrackingLabel);
    const menuAboutLabel = getValue("menuAboutLabel", DEFAULT_SITE_CONFIG.menuAboutLabel);
    const menuContactLabel = getValue("menuContactLabel", DEFAULT_SITE_CONFIG.menuContactLabel);
    const primaryColor = getValue("primaryColor", "#FF97A4");

    // Redes Sociales en Cabecera (Toggle ON/OFF)
    const enableHeaderSocials = getBool("enableHeaderSocials", true);
    const facebookUrl = getValue("facebookUrl", "");
    const instagramUrl = getValue("instagramUrl", "");
    const tiktokUrl = getValue("tiktokUrl", "");
    const whatsappUrl = getValue("whatsappUrl", "");

    // Módulo Social de Instagram/TikTok (Toggle ON/OFF)
    const enableSocialFeed = getBool("enableSocialFeed", true);
    const socialFeedTitle = getValue("socialFeedTitle", DEFAULT_SITE_CONFIG.socialFeedTitle);
    const socialEmbedHtml = getValue("socialEmbedHtml", "");

    // Módulo de Reseñas / Opiniones & Trustpilot (Toggle ON/OFF)
    const enableReviewsSection = getBool("enableReviewsSection", true);
    const reviewsTitle = getValue("reviewsTitle", DEFAULT_SITE_CONFIG.reviewsTitle);
    const reviewsRatingScore = getValue("reviewsRatingScore", DEFAULT_SITE_CONFIG.reviewsRatingScore);
    const reviewsCountText = getValue("reviewsCountText", DEFAULT_SITE_CONFIG.reviewsCountText);
    const trustpilotWidgetHtml = getValue("trustpilotWidgetHtml", "");

    // Módulo de iFrames / Widgets (Toggle ON/OFF)
    const enableCustomIframe = getBool("enableCustomIframe", false);
    const customIframeTitle = getValue("customIframeTitle", DEFAULT_SITE_CONFIG.customIframeTitle);
    const customIframeHtml = getValue("customIframeHtml", "");

    // Módulo de Chatbot Dialogflow CX & Google Gemini (Toggle ON/OFF, Mini Mode y Posición)
    const enableChatbot = getBool("enableChatbot", true);
    const chatbotMiniMode = getBool("chatbotMiniMode", true);
    const chatbotInitialPosition = getValue("chatbotInitialPosition", "bottom-right");
    const geminiApiKey = getValue("geminiApiKey", "");
    const dialogflowAgentId = getValue("dialogflowAgentId", "");
    const dialogflowProjectId = getValue("dialogflowProjectId", "");
    const dialogflowLocation = getValue("dialogflowLocation", "us-central1");
    const dialogflowLanguageCode = getValue("dialogflowLanguageCode", "es");
    const dialogflowChatTitle = getValue("dialogflowChatTitle", "Bonbon Flowers Virtual Assistant 🌸");
    const mapboxToken = getValue("mapboxToken", "");

    await SiteConfig.findOneAndUpdate(
      { key: "global" },
      {
        heroTitle,
        heroSlogan,
        heroButtonText,
        footerTitle,
        footerSlogan,
        footerCopyright,
        productColumnsDesktop,
        productColumnsMobile,
        heroProductMode,
        heroProductId,
        heroPopularCount,
        heroCustomProductIds,
        logoUrl,
        brandSlogan,
        menuHomeLabel,
        menuCatalogLabel,
        menuTrackingLabel,
        menuAboutLabel,
        menuContactLabel,
        primaryColor,
        enableHeaderSocials,
        facebookUrl,
        instagramUrl,
        tiktokUrl,
        whatsappUrl,
        enableSocialFeed,
        socialFeedTitle,
        socialEmbedHtml,
        enableReviewsSection,
        reviewsTitle,
        reviewsRatingScore,
        reviewsCountText,
        trustpilotWidgetHtml,
        enableCustomIframe,
        customIframeTitle,
        customIframeHtml,
        enableChatbot,
        chatbotMiniMode,
        chatbotInitialPosition,
        geminiApiKey,
        dialogflowAgentId,
        dialogflowProjectId,
        dialogflowLocation,
        dialogflowLanguageCode,
        dialogflowChatTitle,
        mapboxToken,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    revalidatePath("/", "layout");
    revalidatePath("/admin/configuracion");
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar configuración del sitio:", error);
    return { success: false, error: "No se pudo guardar la configuración modular." };
  }
}

export async function updateSeoConfig(formData: FormData) {
  await dbConnect();
  try {
    const seoTitle = formData.get("seoTitle") as string || "";
    const seoDescription = formData.get("seoDescription") as string || "";
    const seoKeywords = formData.get("seoKeywords") as string || "";
    const ogImage = formData.get("ogImage") as string || "";
    const googleSiteVerification = formData.get("googleSiteVerification") as string || "";
    const bingSiteVerification = formData.get("bingSiteVerification") as string || "";
    const googleAnalyticsId = formData.get("googleAnalyticsId") as string || "";
    const businessName = formData.get("businessName") as string || "";
    const businessPhone = formData.get("businessPhone") as string || "";
    const businessAddress = formData.get("businessAddress") as string || "";
    const businessCity = formData.get("businessCity") as string || "";

    await SiteConfig.findOneAndUpdate(
      { key: "global" },
      {
        seoTitle,
        seoDescription,
        seoKeywords,
        ogImage,
        googleSiteVerification,
        bingSiteVerification,
        googleAnalyticsId,
        businessName,
        businessPhone,
        businessAddress,
        businessCity,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    revalidatePath("/", "layout");
    revalidatePath("/admin/seo");
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar configuración SEO:", error);
    return { success: false, error: "No se pudieron guardar las configuraciones de SEO." };
  }
}
