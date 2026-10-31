"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ShoppingCart, ArrowLeft, Fingerprint, Menu, X } from "lucide-react";
import { useCart } from "@/components/shop/Cart/CartContext";
import { LanguageSwitcher } from "@/components/shop/LanguageSwitcher";
import { ThemeToggle } from "@/components/shop/ThemeToggle";
import { CustomerBiometricModal } from "@/components/auth/CustomerBiometricModal";
import { useTranslations } from "next-intl";

export const ShopHeader = () => {
  const pathname = usePathname();
  const isSpanish = pathname?.startsWith("/es");
  const langPrefix = isSpanish ? "/es" : "";

  const { cartItems } = useCart();
  const totalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const t = useTranslations("nav");

  const navLinks = [
    { href: isSpanish ? "/es" : "/", label: t('home') },
    { href: `${langPrefix}/productos`, label: t('catalog') },
    { href: `${langPrefix}/rastreo`, label: t('tracking') },
    { href: `${langPrefix}/nosotros`, label: t('about') },
    { href: `${langPrefix}/contacto`, label: t('contact') }
  ];

  return (
    <>
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shadow-sm transition-all"
        style={{
          backgroundColor: "var(--theme-header-bg, rgba(255, 255, 255, 0.95))",
          color: "var(--theme-header-text, inherit)",
        }}
      >
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2 sm:gap-4 xl:gap-6 relative">
          {/* Logo Presionable hacia el Home */}
          <Link href={isSpanish ? "/es" : "/"} className="flex items-center gap-3 group flex-shrink-0 relative z-10">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-emerald-500 shadow-md group-hover:scale-105 group-active:scale-95 transition-transform bg-white p-0.5 flex-shrink-0">
              <img src="/logo.png" alt="Venpide Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="hidden xl:block flex-shrink-0">
              <span className="text-lg font-sans font-black text-stone-900 dark:text-[#E6F7F0] tracking-tight group-hover:text-emerald-600 transition-colors block">
                Venpide <span className="text-emerald-600">Delivery</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-[#76C7B2] font-bold block -mt-0.5">
                Restaurantes & Moto Taxi
              </span>
            </div>
          </Link>

          {/* Navegación Central (Escritorio) */}
          <nav className="hidden lg:flex flex-1 min-w-0 items-center justify-center overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden font-bold text-[11px] xl:text-xs uppercase tracking-wider 2xl:tracking-[0.15em] px-2 gap-1.5 xl:gap-2 2xl:gap-3 py-2 relative z-0">
            {navLinks.map((link, idx) => (
              <Link 
                key={idx}
                href={link.href} 
                className="px-2.5 xl:px-3.5 2xl:px-4 py-1.5 xl:py-2 2xl:py-2.5 rounded-full bg-white/60 dark:bg-stone-900/60 text-stone-900 dark:text-[#B9E6D3] shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-none hover:shadow-[0_8px_20px_rgba(0,0,0,0.12)] hover:bg-white dark:hover:bg-stone-800 hover:text-[#163422] dark:hover:text-[#5EEAD4] hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-300 border border-transparent hover:border-[#163422]/20 dark:hover:border-[#5EEAD4]/30"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Acciones Derecha (Acceso por Huella, Tema, Idioma, Carrito y Toggle Móvil) */}
          <div className="flex items-center gap-2 flex-shrink-0 relative z-10">
            {/* Botón de Acceso Biométrico / Passkeys con Huella */}
            <button
              onClick={() => setIsBioModalOpen(true)}
              className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-900/80 text-stone-800 dark:text-[#B9E6D3] border border-stone-200 dark:border-stone-800 px-2.5 xl:px-3 py-2 rounded-full text-xs font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)] hover:text-[#163422] dark:hover:text-[#5EEAD4] hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
              title={isSpanish ? "Acceso con Huella / Face ID" : "Biometric Access / Face ID"}
            >
              <Fingerprint size={16} />
              <span className="hidden 2xl:inline text-[11px]">{isSpanish ? "Huella 👆" : "Passkey 👆"}</span>
            </button>

            <div className="hover:-translate-y-0.5 active:scale-95 transition-all duration-300">
              <ThemeToggle />
            </div>
            <div className="hover:-translate-y-0.5 active:scale-95 transition-all duration-300">
              <LanguageSwitcher />
            </div>

            {/* Cart Button indicator */}
            <div className="relative ml-1">
              <Link
                href={isSpanish ? "/es/checkout" : "/checkout"}
                className="flex items-center gap-1.5 xl:gap-2 bg-[#163422] dark:bg-[#5EEAD4] text-white dark:text-stone-950 px-2.5 xl:px-3.5 2xl:px-5 py-2 2xl:py-2.5 rounded-full font-bold text-xs hover:opacity-90 transition-all shadow-md"
                style={{
                  backgroundColor: "var(--theme-btn-primary-bg, #163422)",
                  color: "var(--theme-btn-primary-text, #ffffff)",
                }}
              >
                <ShoppingCart size={18} />
                <span className="hidden 2xl:inline">{isSpanish ? "Carrito" : "Cart"}</span>
                {totalCount > 0 && (
                  <span
                    className="text-stone-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "var(--theme-accent, #D4AF37)" }}
                  >
                    {totalCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Botón Toggle de Menú Móvil */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-full bg-slate-100 dark:bg-stone-900/80 text-stone-900 dark:text-[#B9E6D3] border border-gray-200 dark:border-stone-800 hover:bg-slate-200 dark:hover:bg-stone-800 active:scale-95 transition-all"
              aria-label={isMobileMenuOpen ? (isSpanish ? "Contraer menú" : "Close menu") : (isSpanish ? "Desplegar menú" : "Open menu")}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* MENÚ MÓVIL DESPLEGABLE */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-[#181922]/95 backdrop-blur-xl px-4 py-4 space-y-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl bg-gray-50 dark:bg-stone-900/80 text-stone-900 dark:text-[#E6F7F0] font-bold text-sm shadow-sm active:scale-[0.98] transition-all hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-[#163422] dark:hover:text-[#5EEAD4]"
                >
                  <span>{link.label}</span>
                  <span className="text-xs text-[#163422] dark:text-[#5EEAD4]">→</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Modal Biométrico */}
      <CustomerBiometricModal
        isOpen={isBioModalOpen}
        onClose={() => setIsBioModalOpen(false)}
      />
    </>
  );
};
