"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Instagram, Facebook, CheckCircle2 } from "lucide-react";

interface FooterProps {
  siteConfig?: any;
}

export function Footer({ siteConfig }: FooterProps) {
  const pathname = usePathname();
  const isSpanish = pathname?.startsWith("/es");
  const prefix = isSpanish ? "/es" : "";

  const [emailSubscribed, setEmailSubscribed] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setEmailSubscribed(true);
    }
  };

  const instagramUrl = siteConfig?.instagramUrl || "https://www.instagram.com/bonbonflowers__?stkn=MXBnc3hsbHVlM3psMQ==";
  const facebookUrl = siteConfig?.facebookUrl || "https://www.facebook.com/bonbon.flowers.2025";

  return (
    <footer
      className="pt-14 pb-8 border-t border-stone-200 dark:border-stone-800 text-xs transition-colors duration-300 select-none"
      style={{
        backgroundColor: "var(--theme-footer-bg, #ffffff)",
        color: "var(--theme-footer-text, #1c1917)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Fila Principal: Horarios y Suscripción al Newsletter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-12 border-b border-stone-200 dark:border-stone-800">
          
          {/* Horarios de Operación */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <img
                src={siteConfig?.logoUrl || "/logo.png"}
                alt="Venpide Logo"
                className="w-8 h-8 rounded-full object-cover border border-emerald-500"
              />
              <h3
                className="font-black text-xs uppercase tracking-wider font-serif"
                style={{ color: "var(--theme-footer-accent, var(--theme-heading, #163422))" }}
              >
                {isSpanish ? "Horario de Despacho & Atención" : "Hours of operation"}
              </h3>
            </div>
            <p className="opacity-80 leading-relaxed text-xs font-medium">
              {isSpanish ? "Lunes a Domingo: 8:00 AM - 11:00 PM" : "Monday to Sunday: 8:00 AM - 11:00 PM"}<br />
              {isSpanish ? "Flota activa de moto taxis y repartidores urbanos." : "Active fleet of moto couriers and drivers."}
            </p>
            <p
              className="mt-3 text-[11px] font-bold tracking-wide"
              style={{ color: "var(--theme-footer-accent, var(--theme-accent, #163422))" }}
            >
              {siteConfig?.footerSlogan || "Venpide • Plataforma de Delivery, Restaurantes & Moto Taxi"}
            </p>
          </div>

          {/* Formulario de Suscripción */}
          <div>
            <h3
              className="font-black text-xs uppercase tracking-wider mb-3 font-serif"
              style={{ color: "var(--theme-footer-accent, var(--theme-heading, #163422))" }}
            >
              Subscribe to our emails
            </h3>
            <p className="text-stone-600 dark:text-[#B9E6D3] text-xs mb-3 font-medium">
              Be the first to know about new seasonal floral collections and exclusive promotions.
            </p>

            {emailSubscribed ? (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#5EEAD4] bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg text-xs font-bold border border-emerald-200 dark:border-[#5EEAD4]/30">
                <CheckCircle2 size={16} />
                <span>{isSpanish ? "¡Gracias por suscribirte a Bonbon Flowers!" : "Thank you for subscribing to Bonbon Flowers!"}</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 max-w-md">
                <label className="sr-only" htmlFor="footer-email">
                  Email address
                </label>
                <input
                  type="email"
                  id="footer-email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#15161F] border border-stone-400 dark:border-stone-700 text-xs text-stone-900 dark:text-[#E6F7F0] placeholder-stone-500 dark:placeholder-stone-400 focus:outline-none focus:border-stone-900 dark:focus:border-[#5EEAD4] rounded-sm font-medium"
                />
                <button
                  type="submit"
                  className="bg-black hover:bg-stone-800 dark:bg-[#5EEAD4] dark:hover:bg-[#2DD4BF] text-white dark:text-stone-950 px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors shrink-0 rounded-sm"
                >
                  Subscribe
                </button>
              </form>
            )}

            {/* Redes Sociales Oficiales */}
            <div className="flex items-center space-x-4 mt-6 text-stone-600 dark:text-[#76C7B2]">
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook Bonbon Flowers"
                className="hover:text-[#163422] dark:hover:text-[#5EEAD4] transition-colors p-1"
              >
                <Facebook size={18} />
              </a>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram Bonbon Flowers"
                className="hover:text-[#163422] dark:hover:text-[#5EEAD4] transition-colors p-1"
              >
                <Instagram size={18} />
              </a>
            </div>
          </div>
        </div>

        {/* Insignias de Métodos de Pago Aceptados con Máximo Contraste */}
        <div className="py-6 flex flex-wrap justify-center items-center gap-2">
          {/* AMEX */}
          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-white dark:bg-gray-900 border border-stone-300 dark:border-gray-700 rounded text-[10px] font-black text-[#007AC1] shadow-sm">
            AMEX
          </span>
          {/* Apple Pay */}
          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-[10px] font-black text-stone-900 dark:text-[#E6F7F0] shadow-sm">
            Pay
          </span>
          {/* Google Pay */}
          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-[10px] font-black text-stone-900 dark:text-[#E6F7F0] shadow-sm">
            G Pay
          </span>
          {/* Mastercard */}
          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-white dark:bg-gray-900 border border-stone-300 dark:border-gray-700 rounded text-[10px] font-black text-[#EB001B] shadow-sm">
            Mastercard
          </span>
          {/* PayPal */}
          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-white dark:bg-gray-900 border border-stone-300 dark:border-gray-700 rounded text-[10px] font-black text-[#003087] shadow-sm">
            PayPal
          </span>
          {/* Discover */}
          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-white dark:bg-gray-900 border border-stone-300 dark:border-gray-700 rounded text-[10px] font-black text-[#FF6000] shadow-sm">
            Discover
          </span>
          {/* Shop Pay */}
          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-[#5A31F4] rounded text-[10px] font-black !text-white shadow-sm" style={{ color: '#FFFFFF' }}>
            shop Pay
          </span>
          {/* Visa */}
          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-white dark:bg-gray-900 border border-stone-300 dark:border-gray-700 rounded text-[10px] font-black text-[#1A1F71] italic shadow-sm">
            VISA
          </span>
          {/* Zelle */}
          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-white dark:bg-gray-900 border border-stone-300 dark:border-gray-700 rounded text-[10px] font-black text-[#7414CA] shadow-sm">
            Zelle
          </span>
        </div>

        {/* Copyright y Enlaces Legales */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-y-2 text-[11px] text-stone-600 dark:text-[#76C7B2] text-center font-medium">
          <span>
            © {new Date().getFullYear()}, Venpide. All rights reserved.
          </span>
          <span className="hidden sm:inline mx-2 text-stone-400">·</span>
          <div className="flex flex-wrap justify-center gap-x-2 text-stone-800 dark:text-[#B9E6D3]">
            <Link className="text-stone-800 dark:text-[#B9E6D3] hover:text-[#163422] dark:hover:text-[#5EEAD4] font-semibold hover:underline" href={`${prefix}/contacto`}>
              {isSpanish ? "Contacto" : "Contact"}
            </Link>
            <span className="text-stone-400">·</span>
            <Link className="text-stone-800 dark:text-[#B9E6D3] hover:text-[#163422] dark:hover:text-[#5EEAD4] font-semibold hover:underline" href={`${prefix}/nosotros`}>
              {isSpanish ? "Nosotros" : "About Us"}
            </Link>
            <span className="text-stone-400">·</span>
            <Link className="text-stone-800 dark:text-[#B9E6D3] hover:text-[#163422] dark:hover:text-[#5EEAD4] font-semibold hover:underline" href={`${prefix}/productos`}>
              {isSpanish ? "Colección" : "All Flowers"}
            </Link>
            <span className="text-stone-400">·</span>
            <Link className="text-stone-800 dark:text-[#B9E6D3] hover:text-[#163422] dark:hover:text-[#5EEAD4] font-semibold hover:underline" href={`${prefix}/rastreo`}>
              {isSpanish ? "Rastreo" : "Order Tracking"}
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
