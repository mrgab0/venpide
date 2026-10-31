"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Phone, MessageCircle, MapPin } from "lucide-react";

interface HoustonDeliveryBannerProps {
  phone?: string;
  whatsappUrl?: string;
}

export function HoustonDeliveryBanner({
  phone = "(346) 739-2730",
  whatsappUrl = "https://wa.me/13467392730?text=Hola!%20Quisiera%20pedir%20flores%20en%20Houston.",
}: HoustonDeliveryBannerProps) {
  const pathname = usePathname();
  const isSpanish = pathname?.startsWith("/es");
  const neighborhoods = [
    "River Oaks",
    "The Galleria",
    "Downtown",
    "Katy",
    "The Woodlands",
    "Pearland",
    "Sugar Land",
    "Cypress",
    "Heights",
    "Memorial",
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 select-none">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#122419] via-[#163422] to-[#0c1811] dark:from-[#0d1711] dark:via-[#111915] dark:to-[#090e0b] border-2 border-[#2b593b]/70 dark:border-emerald-900/60 text-white p-6 sm:p-10 shadow-2xl">
        {/* Glow decorativo de fondo */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#5EEAD4]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-[#FF97A4]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            {/* Tag destacado con contraste */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5EEAD4]/20 border border-[#5EEAD4]/60 text-[#5EEAD4] text-xs font-black uppercase tracking-wider shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5EEAD4] animate-pulse" />
              <span>{isSpanish ? "Logística y Delivery Express Venpide" : "Venpide Express Delivery & Logistics"}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black tracking-tight text-white leading-tight drop-shadow-sm">
              {isSpanish ? "¿Quieres pedir de tus restaurantes o necesitas un moto taxi?" : "Craving food or need an express moto courier?"}
            </h3>

            <p className="text-sm sm:text-base text-emerald-100/90 dark:text-stone-200 font-medium leading-relaxed">
              {isSpanish
                ? "Conectamos clientes, establecimientos y conductores de moto taxi en tiempo récord. Comunícate directamente por WhatsApp y sigue tu entrega en vivo."
                : "Connecting customers, stores, and express drivers in minutes. Message us directly on WhatsApp and track your order in real time."}
            </p>

            {/* Chips de vecindarios con contraste AAA */}
            <div className="flex flex-wrap gap-2 pt-2">
              {neighborhoods.map((zone) => (
                <span
                  key={zone}
                  className="px-3.5 py-1.5 rounded-full bg-white/15 dark:bg-white/10 hover:bg-white/25 border border-white/30 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors backdrop-blur-xs"
                >
                  <MapPin size={12} className="text-[#FF97A4] shrink-0" />
                  <span>{zone}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Acciones directas con máxima legibilidad */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <a
              href={`tel:${phone.replace(/\D/g, "")}`}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white hover:bg-stone-100 text-[#163422] font-black text-xs uppercase tracking-wider transition-all duration-300 active:scale-95 shadow-md border border-white"
            >
              <Phone size={16} className="text-[#163422]" />
              <span>{phone}</span>
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#FF97A4] hover:bg-[#ff8090] text-stone-950 font-black text-xs uppercase tracking-wider transition-all duration-300 active:scale-95 shadow-lg hover:shadow-[#FF97A4]/30"
            >
              <MessageCircle size={16} />
              <span>{isSpanish ? "Chatear por WhatsApp" : "Chat on WhatsApp"}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
