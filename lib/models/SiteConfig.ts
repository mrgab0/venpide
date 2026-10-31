import mongoose, { Schema, Document } from "mongoose";

export interface ICorporateAccount {
  id: string;
  email: string;
  name: string;
  role: string;
  color?: string;
  isDefault?: boolean;
  signature?: string;
}

export interface IThemeConfig {
  announcementBg?: string;
  announcementText?: string;
  headerBg?: string;
  headerText?: string;
  buttonPrimaryBg?: string;
  buttonPrimaryText?: string;
  buttonPrimaryHoverBg?: string;
  buttonSecondaryBg?: string;
  buttonSecondaryText?: string;
  accentColor?: string;
  headingColor?: string;
  bodyTextColor?: string;
  scriptTextColor?: string;
  footerBg?: string;
  footerText?: string;
  footerAccent?: string;
  pageBg?: string;
  cardBg?: string;
  cardBorder?: string;
  priceColor?: string;
  badgeBg?: string;
  badgeText?: string;
}

export interface IDoorDashConfig {
  verificationFileName?: string;
  verificationFileContent?: string;
  scriptHtml?: string;
  scriptEnabled?: boolean;
  developerId?: string;
  keyId?: string;
  signingSecret?: string;
  storeId?: string;
  pickupInstructions?: string;
  leadTimeMinutes?: number;
  environment?: "sandbox" | "production";
  autoDispatchEnabled?: boolean;
}

export interface IMetaWhatsAppConfig {
  phoneNumberId?: string;
  wabaId?: string;
  accessToken?: string;
  verifyToken?: string;
  webhookUrl?: string;
  autoForwardToDriver?: boolean;
  autoForwardToCustomer?: boolean;
}

export interface ISiteConfig extends Document {
  key: string; // "global"
  heroTitle: string;
  heroSlogan: string;
  heroButtonText: string;
  footerTitle: string;
  footerSlogan: string;
  footerCopyright: string;

  // Personalización del Home & Cuadrícula de Productos
  productColumnsDesktop?: number; // 3, 4, o 5 columnas
  productColumnsMobile?: number;  // 1 o 2 columnas

  // Configuración del Producto Destacado en Hero (Showcase)
  heroProductMode?: "popular" | "single" | "custom_list";
  heroProductId?: string;
  heroPopularCount?: number;
  heroCustomProductIds?: string[];

  // Identidad de Marca y Menú de Navegación
  logoUrl?: string;
  brandSlogan?: string;
  menuHomeLabel?: string;
  menuCatalogLabel?: string;
  menuTrackingLabel?: string;
  menuAboutLabel?: string;
  menuContactLabel?: string;
  primaryColor?: string;

  // Redes Sociales en Cabecera
  enableHeaderSocials?: boolean;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  whatsappUrl?: string;

  // Módulo Social de Instagram / TikTok (Pre-Footer)
  enableSocialFeed?: boolean;
  socialFeedTitle?: string;
  socialEmbedHtml?: string;

  // Módulo de Reseñas / Opiniones & Trustpilot (Pre-Footer)
  enableReviewsSection?: boolean;
  reviewsTitle?: string;
  reviewsRatingScore?: string;
  reviewsCountText?: string;
  trustpilotWidgetHtml?: string;

  // Módulo de iFrames / Widgets Personalizados
  enableCustomIframe?: boolean;
  customIframeTitle?: string;
  customIframeHtml?: string;

  // Módulo de Chatbot Inteligente Dialogflow CX & Google Gemini
  enableChatbot?: boolean;
  chatbotMiniMode?: boolean;
  chatbotInitialPosition?: "bottom-right" | "bottom-left";
  geminiApiKey?: string;
  dialogflowAgentId?: string;
  dialogflowProjectId?: string;
  dialogflowLocation?: string;
  dialogflowLanguageCode?: string;
  dialogflowChatTitle?: string;

  // Campos de 2FA (Seguridad de Dos Factores)
  twoFactorMode?: "none" | "pin" | "totp";
  twoFactorPin?: string;
  twoFactorSecret?: string;

  // Código OTP de rescate por email de emergencia
  rescueOtpCode?: string;
  rescueOtpExpiresAt?: Date;

  // Campos de Optimización SEO y Google Maps
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogImage?: string;
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  googleAnalyticsId?: string;
  businessName?: string;
  businessPhone?: string;
  businessAddress?: string;
  businessCity?: string;
  mapboxToken?: string;

  // Configuración de Correo Corporativo & Resend
  corporateSenderEmail?: string;
  corporateSenderName?: string;
  corporateReplyToEmail?: string;
  resendApiKey?: string;
  adminNotifyEmails?: string[];
  corporateAccounts?: ICorporateAccount[];

  // Widget Flotante de Captación de Leads (Pop-up Newsletter)
  leadCaptureActive?: boolean;
  leadCaptureTemplate?: "champagne_pill" | "velvet_modal" | "corner_toast";
  leadCaptureTitle?: string;
  leadCaptureSubtitle?: string;
  leadCaptureCouponCode?: string;
  leadCaptureDelaySeconds?: number;

  // Editor de Tema Visual de la Tienda
  themeConfig?: IThemeConfig;

  // Integración y Verificación de DoorDash Drive
  doordashConfig?: IDoorDashConfig;

  // Integración de Meta Cloud API WhatsApp
  metaWhatsAppConfig?: IMetaWhatsAppConfig;

  updatedAt: Date;
}

const SiteConfigSchema: Schema = new Schema({
  key: { type: String, required: true, unique: true, default: "global" },
  heroTitle: { type: String, default: "Venpide | Delivery & Logística Express" },
  heroSlogan: { type: String, default: "Pide de tus restaurantes y comercios preferidos con entrega inmediata en moto taxi." },
  heroButtonText: { type: String, default: "Pedir Ahora" },
  footerTitle: { type: String, default: "Venpide" },
  footerSlogan: { type: String, default: "Plataforma de Delivery, Restaurantes & Moto Taxi" },
  footerCopyright: { type: String, default: "© 2026 Venpide. Todos los derechos reservados." },

  // Personalización del Home & Cuadrícula (Por defecto 3 columnas en escritorio = Preservación 100%)
  productColumnsDesktop: { type: Number, default: 3 },
  productColumnsMobile: { type: Number, default: 2 },

  // Configuración del Producto Destacado en Hero (Showcase)
  heroProductMode: { type: String, default: "popular" },
  heroProductId: { type: String, default: "" },
  heroPopularCount: { type: Number, default: 10 },
  heroCustomProductIds: { type: [String], default: [] },

  // Identidad de Marca y Menú
  logoUrl: { type: String, default: "/logo.png" },
  brandSlogan: { type: String, default: "Delivery Express & Moto Taxi" },
  menuHomeLabel: { type: String, default: "Inicio" },
  menuCatalogLabel: { type: String, default: "Restaurantes & Menús" },
  menuTrackingLabel: { type: String, default: "🛵 Rastreo de Envíos" },
  menuAboutLabel: { type: String, default: "Nosotros" },
  menuContactLabel: { type: String, default: "Contacto" },
  primaryColor: { type: String, default: "#E11D48" },

  // Redes Sociales en Cabecera
  enableHeaderSocials: { type: Boolean, default: true },
  facebookUrl: { type: String, default: "https://www.facebook.com/bonbon.flowers.2025" },
  instagramUrl: { type: String, default: "https://www.instagram.com/bonbonflowers__?stkn=MXBnc3hsbHVlM3psMQ==" },
  tiktokUrl: { type: String, default: "https://tiktok.com" },
  whatsappUrl: { type: String, default: "https://wa.me/13467392730" },

  // Módulo Social Pre-Footer (Incrustados Instagram/TikTok)
  enableSocialFeed: { type: Boolean, default: true },
  socialFeedTitle: { type: String, default: "Síguenos en Instagram @bonbonflowers__ 📸" },
  socialEmbedHtml: { type: String, default: "" },

  // Módulo de Reseñas / Opiniones & Trustpilot (Pre-Footer)
  enableReviewsSection: { type: Boolean, default: true },
  reviewsTitle: { type: String, default: "Lo que dicen nuestros clientes en Houston ⭐⭐⭐⭐⭐" },
  reviewsRatingScore: { type: String, default: "4.9 / 5.0" },
  reviewsCountText: { type: String, default: "+180 Opiniones Verificadas" },
  trustpilotWidgetHtml: { type: String, default: "" },

  // Módulo de iFrames Personalizados
  enableCustomIframe: { type: Boolean, default: false },
  customIframeTitle: { type: String, default: "Ubicación & Promociones Destacadas" },
  customIframeHtml: { type: String, default: "" },

  // Módulo de Chatbot Inteligente Dialogflow CX & Google Gemini
  enableChatbot: { type: Boolean, default: true },
  chatbotMiniMode: { type: Boolean, default: true },
  chatbotInitialPosition: { type: String, default: "bottom-right" },
  geminiApiKey: { type: String, default: "" },
  dialogflowAgentId: { type: String, default: "" },
  dialogflowProjectId: { type: String, default: "" },
  dialogflowLocation: { type: String, default: "us-central1" },
  dialogflowLanguageCode: { type: String, default: "es" },
  dialogflowChatTitle: { type: String, default: "Flor • Bonbon Flowers 🌸" },

  twoFactorMode: { type: String, default: "none" },
  twoFactorPin: { type: String, default: "" },
  twoFactorSecret: { type: String, default: "" },

  rescueOtpCode: { type: String, default: "" },
  rescueOtpExpiresAt: { type: Date, default: null },

  // Campos SEO por defecto
  seoTitle: { type: String, default: "Bonbon Flowers Houston | Boutique Digital de Alta Floristería" },
  seoDescription: { type: String, default: "Floristería exclusiva con arreglos florales de lujo, rosas y detalles personalizados a domicilio con entrega express en Houston, TX." },
  seoKeywords: { type: String, default: "floristeria, flores a domicilio, arreglos florales, rosas, ramos de flores, regalos, houston tx, bonbon flowers" },
  ogImage: { type: String, default: "https://bonbonflowershouston.com/logo.png" },
  googleSiteVerification: { type: String, default: "" },
  bingSiteVerification: { type: String, default: "" },
  googleAnalyticsId: { type: String, default: "" },
  businessName: { type: String, default: "Bonbon Flowers" },
  businessPhone: { type: String, default: "+1 (346) 739-2730" },
  businessAddress: { type: String, default: "Houston, TX" },
  businessCity: { type: String, default: "Houston, TX" },
  mapboxToken: { type: String, default: "" },

  // Configuración de Correo Corporativo & Resend
  corporateSenderEmail: { type: String, default: "orders@bonbonflowerhouston.com" },
  corporateSenderName: { type: String, default: "Bonbon Flowers Houston" },
  corporateReplyToEmail: { type: String, default: "contact@bonbonflowerhouston.com" },
  resendApiKey: { type: String, default: "" },
  adminNotifyEmails: { type: [String], default: ["orders@bonbonflowerhouston.com", "iirockalonso@gmail.com"] },
  corporateAccounts: {
    type: [
      {
        id: { type: String, required: true },
        email: { type: String, required: true },
        name: { type: String, required: true },
        role: { type: String, default: "General" },
        color: { type: String, default: "#163422" },
        isDefault: { type: Boolean, default: false },
        signature: { type: String, default: "" },
      },
    ],
    default: [
      {
        id: "contacto",
        email: "contacto@bonbonflowershouston.com",
        name: "Bonbon Flowers Houston",
        role: "Atención al Cliente",
        color: "#163422",
        isDefault: true,
        signature: "Bonbon Flowers Houston • Boutique Digital de Flores de Lujo",
      },
      {
        id: "sales",
        email: "sales@bonbonflowershouston.com",
        name: "Ventas & Pedidos VIP",
        role: "Ventas y Cotizaciones",
        color: "#C5A059",
        isDefault: false,
        signature: "Equipo de Ventas • Bonbon Flowers Houston",
      },
      {
        id: "ceo",
        email: "ceo@bonbonflowershouston.com",
        name: "Dirección Ejecutiva",
        role: "Gerencia General",
        color: "#0F1210",
        isDefault: false,
        signature: "Dirección Ejecutiva • Bonbon Flowers Houston",
      },
    ],
  },

  // Widget Flotante de Captación de Leads (Pop-up Newsletter)
  leadCaptureActive: { type: Boolean, default: true },
  leadCaptureTemplate: { type: String, default: "champagne_pill" },
  leadCaptureTitle: { type: String, default: "Recibe 10% de Regalo en tu Primera Compra" },
  leadCaptureSubtitle: { type: String, default: "Suscríbete a nuestro club exclusivo y recibe un cupón de cortesía para tu próximo arreglo floral." },
  leadCaptureCouponCode: { type: String, default: "BIENVENIDO10" },
  leadCaptureDelaySeconds: { type: Number, default: 7 },

  // Editor de Tema Visual (Home, Header, Botones, Textos, Footer)
  themeConfig: {
    announcementBg: { type: String, default: "#33cccc" },
    announcementText: { type: String, default: "#1c1917" },
    headerBg: { type: String, default: "#ffffff" },
    headerText: { type: String, default: "#163422" },
    buttonPrimaryBg: { type: String, default: "#163422" },
    buttonPrimaryText: { type: String, default: "#ffffff" },
    buttonPrimaryHoverBg: { type: String, default: "#1F452E" },
    buttonSecondaryBg: { type: String, default: "#FF97A4" },
    buttonSecondaryText: { type: String, default: "#ffffff" },
    accentColor: { type: String, default: "#C5A059" },
    headingColor: { type: String, default: "#163422" },
    bodyTextColor: { type: String, default: "#4A5568" },
    scriptTextColor: { type: String, default: "#163422" },
    footerBg: { type: String, default: "#ffffff" },
    footerText: { type: String, default: "#1c1917" },
    footerAccent: { type: String, default: "#163422" },
    pageBg: { type: String, default: "#FDFBF7" },
    cardBg: { type: String, default: "#ffffff" },
    cardBorder: { type: String, default: "#f3f4f6" },
    priceColor: { type: String, default: "#163422" },
    badgeBg: { type: String, default: "#FF97A4" },
    badgeText: { type: String, default: "#ffffff" },
  },

  // Integración y Verificación de DoorDash Drive
  doordashConfig: {
    verificationFileName: { type: String, default: "" },
    verificationFileContent: { type: String, default: "" },
    scriptHtml: { type: String, default: "" },
    scriptEnabled: { type: Boolean, default: false },
    developerId: { type: String, default: "" },
    keyId: { type: String, default: "" },
    signingSecret: { type: String, default: "" },
    storeId: { type: String, default: "" },
    pickupInstructions: { type: String, default: "Recoger pedido en mostrador." },
    leadTimeMinutes: { type: Number, default: 30 },
    environment: { type: String, default: "production" },
    autoDispatchEnabled: { type: Boolean, default: false },
  },

  // Integración de Meta Cloud API WhatsApp & CRM
  metaWhatsAppConfig: {
    phoneNumberId: { type: String, default: "" },
    wabaId: { type: String, default: "" },
    accessToken: { type: String, default: "" },
    verifyToken: { type: String, default: "venpide_webhook_token_2026" },
    webhookUrl: { type: String, default: "/api/webhook/whatsapp" },
    autoForwardToDriver: { type: Boolean, default: true },
    autoForwardToCustomer: { type: Boolean, default: true },
  },

  updatedAt: { type: Date, default: Date.now }
});

export const SiteConfig = mongoose.models.SiteConfig || mongoose.model<ISiteConfig>("SiteConfig", SiteConfigSchema);
