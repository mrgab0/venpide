"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Phone,
  Truck,
  Clock,
  MapPin,
  Fingerprint,
  Moon,
  Sun,
  Menu,
  X,
  ArrowRight,
  Heart,
} from "lucide-react";
import { useTheme } from "next-themes";
import { LanguageSwitcher } from "@/components/shop/LanguageSwitcher";

const CustomerBiometricModal = dynamic(
  () => import("@/components/auth/CustomerBiometricModal").then((m) => m.CustomerBiometricModal),
  { ssr: false }
);

interface StitchMobileHeaderAndHeroProps {
  siteConfig?: any;
  heroProducts?: any[];
  locale?: string;
}

export const StitchMobileHeaderAndHero: React.FC<StitchMobileHeaderAndHeroProps> = ({
  siteConfig,
  heroProducts = [],
  locale = "en",
}) => {
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const isSpanish = locale === "es";
  const phone = siteConfig?.contactPhone || "(346) 739-2730";
  const cleanPhone = phone.replace(/[^\d+]/g, "");

  const prefix = isSpanish ? "/es" : "";

  // Producto destacado dinámico de Hero
  const fallbackProduct = {
    name: "Pink & Sunshine Bouquet Yellow and Pink Roses",
    slug: "pink-sunshine-bouquet-yellow-and-pink-roses-100",
    images: ["https://ik.imagekit.io/4ub2sqhjx/products/Screenshot_378_BlXSezTsB.png"],
  };

  const activeProduct =
    heroProducts && heroProducts.length > 0 && heroProducts[0]
      ? heroProducts[0]
      : fallbackProduct;

  const featuredProductLink = activeProduct?.slug
    ? `${prefix}/productos/${activeProduct.slug}`
    : "#catalogo";

  const featuredProductImage =
    activeProduct?.images && activeProduct.images.length > 0 && activeProduct.images[0]
      ? activeProduct.images[0]
      : "https://ik.imagekit.io/4ub2sqhjx/products/Screenshot_378_BlXSezTsB.png";

  const featuredProductTitle =
    activeProduct?.name || (isSpanish ? "Colección Destacada Bonbon Flowers Houston" : "Featured Collection Bonbon Flowers Houston");

  // 5 Categorías circulares con gradientes e imágenes permanentes optimizadas desde ImageKit
  const categories = [
    {
      id: "love-romance",
      name: "LOVE & ROMANCE",
      ringGradient: "from-[#fbc2cb] to-[#f9e2e6]",
      image: "https://ik.imagekit.io/4ub2sqhjx/products/Screenshot_280_2OeW7r1QZa.png",
      href: `${prefix}/productos?search=romance`,
      twoLines: ["LOVE &", "ROMANCE"],
    },
    {
      id: "birthday",
      name: "BIRTHDAY",
      ringGradient: "from-[#fde68a] to-[#fef3c7]",
      image: "https://ik.imagekit.io/4ub2sqhjx/products/Screenshot_330_o3LDIGwS_.png",
      href: `${prefix}/productos?search=cumpleaños`,
      twoLines: ["BIRTHDAY"],
    },
    {
      id: "graduation",
      name: "GRADUATION",
      ringGradient: "from-[#fbc2cb] to-[#fce7f3]",
      image: "https://ik.imagekit.io/4ub2sqhjx/products/Screenshot_348_LvvLdITtU.png",
      href: `${prefix}/productos?search=graduacion`,
      twoLines: ["GRADUATION"],
    },
    {
      id: "flowers-gifts",
      name: "FLOWERS + GIFTS",
      ringGradient: "from-[#fed7aa] to-[#ffedd5]",
      image: "https://ik.imagekit.io/4ub2sqhjx/products/Screenshot_282_cUXpPUEqd.png",
      href: `${prefix}/productos?cat=adicionales`,
      twoLines: ["FLOWERS", "+ GIFTS"],
    },
    {
      id: "balloons-helium",
      name: "BALLOONS WITH HELIUM",
      ringGradient: "from-[#fbc2cb] to-[#fde2e4]",
      image: "https://ik.imagekit.io/4ub2sqhjx/products/Screenshot_375_-BXrInYiq.png",
      href: `${prefix}/productos?cat=globos`,
      twoLines: ["BALLOONS", "WITH HELIUM"],
    },
  ];

  const navLinks = [
    { href: `${prefix}/`, label: isSpanish ? "Inicio" : "Home" },
    { href: `${prefix}/productos`, label: isSpanish ? "Colección" : "Catalog" },
    { href: `${prefix}/rastreo`, label: isSpanish ? "Rastreo" : "Tracking" },
    { href: `${prefix}/nosotros`, label: isSpanish ? "Nosotros" : "About Us" },
    { href: `${prefix}/contacto`, label: isSpanish ? "Contacto" : "Contact" },
    { href: `${prefix}/checkout`, label: isSpanish ? "Carrito" : "Cart" },
  ];

  return (
    <div className="w-full bg-[#faf8f5] dark:bg-[#0c0d12] transition-colors duration-300">
      {/* 1. TOP RIBBON: DELIVERY EXPRESS VENPIDE */}
      <div className="bg-[#e6f7f0] dark:bg-emerald-950/60 py-2 px-3 text-center border-b border-[#c2ebd8] dark:border-emerald-900/40 flex items-center justify-center gap-1.5 transition-colors">
        <Phone className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400 shrink-0" />
        <a
          href={`tel:${cleanPhone || "+584120000000"}`}
          className="text-[10.5px] sm:text-xs font-semibold tracking-wider text-emerald-900 dark:text-emerald-200 uppercase hover:underline"
        >
          DELIVERY EXPRESS & MOTO TAXI VENPIDE • {phone} →
        </a>
      </div>

      {/* 2. VALUE PROPS ROW (3 COLUMNS CON BORDES VERTICALES) */}
      <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-800 border-b border-gray-200/80 dark:border-gray-800 bg-white/70 dark:bg-stone-900/60 py-2.5 px-1 text-center max-w-5xl mx-auto">
        {/* Item 1 */}
        <div className="flex flex-col items-center justify-center px-1">
          <Truck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 mb-1" />
          <span className="text-[7.5px] sm:text-[9.5px] font-bold text-gray-700 dark:text-gray-300 leading-tight uppercase tracking-tight">
            DELIVERY EXPRESS
            <br />
            EN MINUTOS
          </span>
        </div>

        {/* Item 2 */}
        <div className="flex flex-col items-center justify-center px-1">
          <Clock className="w-4 h-4 text-emerald-700 dark:text-emerald-400 mb-1" />
          <span className="text-[7.5px] sm:text-[9.5px] font-bold text-gray-700 dark:text-gray-300 leading-tight uppercase tracking-tight">
            TUS RESTAURANTES
            <br />Y COMERCIOS
          </span>
        </div>

        {/* Item 3 */}
        <div className="flex flex-col items-center justify-center px-1">
          <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400 mb-1" />
          <span className="text-[7.5px] sm:text-[9.5px] font-bold text-gray-700 dark:text-gray-300 leading-tight uppercase tracking-tight">
            FLOTA ACTIVA
            <br />
            DE MOTO TAXIS
          </span>
        </div>
      </div>

      {/* 3. MAIN HEADER / NAVBAR */}
      <header className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3 relative">
        {/* Brand Logo Circle con Borde Esmeralda */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center group">
            <div className="w-14 h-14 rounded-full border-2 border-emerald-500 bg-white dark:bg-stone-900 flex flex-col items-center justify-center p-1 shadow-sm text-center group-hover:scale-105 transition-transform">
              <span className="text-[20px] font-sans text-emerald-600 dark:text-emerald-400 font-black leading-none -mb-0.5">
                V
              </span>
              <span className="text-[6.5px] font-bold tracking-[0.14em] text-[#333] dark:text-gray-200 uppercase leading-none mt-0.5">
                VENPIDE
              </span>
              <span className="text-[4.8px] font-medium tracking-[0.08em] text-[#777] dark:text-gray-400 uppercase leading-none mt-0.5">
                DELIVERY
              </span>
            </div>
          </Link>

          <div className="hidden sm:flex flex-col text-left">
            <span className="font-sans font-black text-xl text-stone-900 dark:text-white leading-tight">
              Venpide <span className="text-emerald-600 dark:text-emerald-400">Delivery</span>
            </span>
            <span className="text-[9.5px] tracking-[0.22em] uppercase font-bold text-emerald-600 dark:text-emerald-400">
              Restaurantes & Moto Taxi
            </span>
          </div>
        </div>

        {/* Links para Pantallas Medianas / Grandes */}
        <nav className="hidden md:flex items-center gap-6 font-bold uppercase tracking-wider text-xs text-stone-700 dark:text-gray-200">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              className="hover:text-[#1b4332] dark:hover:text-[#5EEAD4] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions / Toggles en Píldoras Suaves #f0ede8 */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Fingerprint / Huella icon */}
          <button
            type="button"
            onClick={() => setIsBioModalOpen(true)}
            className="w-9 h-9 rounded-full bg-[#f0ede8] dark:bg-stone-800 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-[#e6e2dc] dark:hover:bg-stone-700 transition-colors shadow-2xs"
            title={isSpanish ? "Acceso biométrico / Registro seguro" : "Biometric access / Secure login"}
            aria-label={isSpanish ? "Acceso biométrico" : "Biometric access"}
          >
            <Fingerprint className="w-4 h-4" />
          </button>

          {/* Moon / Dark mode toggle icon */}
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 rounded-full bg-[#f0ede8] dark:bg-stone-800 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-[#e6e2dc] dark:hover:bg-stone-700 transition-colors shadow-2xs"
            title={isSpanish ? "Cambiar modo claro / oscuro" : "Toggle light / dark mode"}
            aria-label={isSpanish ? "Cambiar tema" : "Toggle theme"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Language selector badge */}
          <div className="h-9 px-2 rounded-full bg-[#f0ede8] dark:bg-stone-800 flex items-center gap-1 text-[10px] font-bold text-gray-800 dark:text-gray-200 shadow-2xs">
            <LanguageSwitcher />
          </div>

          {/* Hamburger menu icon */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-9 h-9 rounded-xl bg-[#f0ede8] dark:bg-stone-800 flex items-center justify-center text-gray-800 dark:text-gray-200 hover:bg-[#e6e2dc] dark:hover:bg-stone-700 transition-colors shadow-2xs md:hidden"
            aria-label={isSpanish ? "Menú móvil" : "Mobile menu"}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Menú Móvil Desplegable */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-y border-stone-200 dark:border-gray-800 bg-white/98 dark:bg-[#12131A]/98 backdrop-blur-xl px-4 py-3 space-y-1 shadow-lg animate-in fade-in duration-200">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 px-3 rounded-lg text-stone-800 dark:text-gray-100 font-bold text-xs uppercase hover:bg-pink-50 dark:hover:bg-gray-800"
            >
              <span>{link.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#1b4332] dark:text-[#5EEAD4]" />
            </Link>
          ))}
        </div>
      )}

      {/* 4. HIGHLIGHT COUTURE PILL */}
      <div className="px-4 mt-1 mb-4 max-w-md mx-auto">
        <div className="bg-[#e6f7f0] dark:bg-emerald-950/40 py-1.5 px-3 rounded-full text-center border border-[#c2ebd8] dark:border-emerald-900/40 shadow-2xs">
          <span className="text-[9.5px] font-bold tracking-[0.16em] text-emerald-800 dark:text-emerald-300 uppercase">
            • VENPIDE LOGÍSTICA & DESPACHO URBANO •
          </span>
        </div>
      </div>

      {/* 5. HERO SECTION WITH COMPACT 2-COLUMN LAYOUT */}
      <section className="px-4 relative overflow-hidden max-w-4xl mx-auto">
        {/* Subtle Ambient Background Glow */}
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-emerald-100/50 dark:bg-emerald-900/20 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="flex items-start justify-between gap-2 sm:gap-6">
          {/* Left Editorial Column */}
          <div className="w-[58%] sm:w-[60%] pt-2 z-10">
            {/* Eyebrow */}
            <p className="text-[8.5px] sm:text-[10px] font-bold tracking-[0.18em] text-emerald-800 dark:text-emerald-400 uppercase mb-1.5 flex items-center gap-1">
              <span>DELIVERY EXPRESS • MOTO TAXI</span>
            </p>

            {/* Main Title */}
            <h1 className="text-[27px] sm:text-4xl lg:text-5xl leading-[1.08] text-[#1c2e24] dark:text-white font-sans mb-1 font-black tracking-tight">
              Pide tu
              <br />
              comida y
              <br />
              compras
            </h1>

            {/* Calligraphy Cursive line */}
            <div className="text-[36px] sm:text-5xl lg:text-6xl leading-[0.9] text-emerald-700 dark:text-emerald-400 font-sans font-black mb-3 pl-1">
              en minutos 🛵
            </div>

            {/* Description Paragraph */}
            <p className="text-[10px] sm:text-xs leading-[1.4] text-gray-600 dark:text-gray-300 mb-4 max-w-[210px] sm:max-w-md font-medium">
              {siteConfig?.heroSlogan ||
                (isSpanish
                  ? "Tus restaurantes y establecimientos preferidos a domicilio con flota de moto taxi y confirmación por WhatsApp."
                  : "Your favorite local restaurants and stores delivered fast by motorbikes with live WhatsApp tracking.")}
            </p>

            {/* CTA Button */}
            <a
              href="#catalogo"
              className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-[10.5px] sm:text-xs font-bold px-4 py-2.5 rounded-full shadow-md transition-all hover:scale-102 active:scale-98"
            >
              <span>{siteConfig?.heroButtonText || (isSpanish ? "EXPLORAR MENÚS" : "ORDER NOW")}</span>
              <span>→</span>
            </a>
          </div>

          {/* Right Photographic Column: Hatbox with Roses & Teddy Bear */}
          <div className="w-[42%] sm:w-[40%] relative -mr-2 sm:mr-0 mt-1">
            <Link
              href={featuredProductLink}
              className="block group"
              title={featuredProductTitle}
            >
              <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-lg border border-[#f0e4db]/80 dark:border-gray-800 bg-[#fff5f5] dark:bg-stone-900 group-hover:scale-[1.02] transition-transform duration-300">
                <img
                  src={featuredProductImage}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt={featuredProductTitle}
                />
              </div>
            </Link>
            {/* Decorative falling rose petals */}
            <div className="absolute -bottom-2 -left-2 w-5 h-3 bg-[#c71f37] rounded-full rotate-45 shadow-sm opacity-90 pointer-events-none" />
            <div className="absolute bottom-2 -right-1 w-4 h-2.5 bg-[#a01328] rounded-full -rotate-12 shadow-sm opacity-80 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* 6. 5 CIRCULAR CATEGORIES (EXACT ROW FROM REFERENCE) */}
      <section className="mt-8 mb-6 px-3 max-w-4xl mx-auto">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-4 text-center items-start">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              className="flex flex-col items-center group cursor-pointer transition-transform hover:scale-105 active:scale-95"
            >
              <div
                className={`w-14 h-14 sm:w-18 sm:h-18 rounded-full p-0.5 bg-gradient-to-tr ${cat.ringGradient} shadow-sm flex items-center justify-center`}
              >
                <img
                  src={cat.image}
                  className="w-full h-full rounded-full object-cover"
                  alt={cat.name}
                />
              </div>
              <span className="text-[8px] sm:text-[10px] font-bold text-gray-800 dark:text-gray-200 tracking-tight leading-tight uppercase mt-2 group-hover:text-[#b8335b] dark:group-hover:text-[#ff8fa3] transition-colors">
                {cat.twoLines.map((line, lIdx) => (
                  <React.Fragment key={lIdx}>
                    {line}
                    {lIdx < cat.twoLines.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Modal Biométrico */}
      {isBioModalOpen && (
        <CustomerBiometricModal
          isOpen={isBioModalOpen}
          onClose={() => setIsBioModalOpen(false)}
        />
      )}
    </div>
  );
};
