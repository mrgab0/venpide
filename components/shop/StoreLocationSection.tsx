"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";

interface StoreLocationSectionProps {
  phone?: string;
  email?: string;
  whatsappUrl?: string;
}

export const StoreLocationSection: React.FC<StoreLocationSectionProps> = ({
  phone = "(346) 739-2730",
  email = "contacto@bonbonflowershouston.com",
  whatsappUrl = "https://wa.me/13467392730?text=Hola!%20Quisiera%20información%20sobre%20sus%20flores%20en%20Houston."
}) => {
  const pathname = usePathname();
  const isSpanish = pathname?.startsWith("/es");
  const cleanPhone = phone.replace(/[^\d+]/g, "");

  return (
    <section className="relative w-full flex flex-col md:block md:min-h-[540px] border-t border-b border-stone-300 dark:border-gray-800 overflow-hidden select-none bg-stone-50 dark:bg-[#0c0d12]">
      {/* 1. Contenedor del Mapa: en móvil va primero (arriba) con altura fija; en desktop es absoluto llenando toda la sección */}
      <div className="relative w-full h-[320px] sm:h-[380px] md:h-full md:absolute md:inset-0 overflow-hidden">
        <iframe
          title="Ubicación Bonbon Flowers Houston - 9546 Hammerly Boulevard"
          src="https://www.openstreetmap.org/export/embed.html?bbox=-95.548%2C29.802%2C-95.518%2C29.819&amp;layer=mapnik&amp;marker=29.8105%2C-95.5323"
          className="w-full h-full border-0 filter contrast-[1.05] brightness-[0.98] dark:invert dark:hue-rotate-180 dark:contrast-125"
          loading="lazy"
        />

        {/* Gradiente ambiental superior e inferior para integración visual */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/20 dark:from-[#0B0C10]/40 dark:via-transparent dark:to-[#0B0C10]/30 pointer-events-none" />

        {/* Pin animado en el mapa */}
        <div className="absolute left-[50%] md:left-[55%] top-[50%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none">
          <div className="text-emerald-600 animate-bounce drop-shadow-lg">
            <MapPin size={38} fill="currentColor" className="text-white dark:text-stone-950" />
          </div>
          <span className="bg-white dark:bg-stone-900 text-black dark:text-white text-[10px] sm:text-[11px] font-black px-3 py-0.5 rounded-full shadow-md border-2 border-emerald-600 uppercase tracking-wider -mt-1 whitespace-nowrap">
            Venpide Central &amp; Despacho
          </span>
        </div>

        {/* Marca de agua informativa en el mapa */}
        <div className="absolute bottom-3 left-3 sm:left-6 z-10 text-[10px] sm:text-[11px] text-black dark:text-white bg-white/85 dark:bg-black/80 backdrop-blur-xs px-2.5 py-1 rounded-md font-sans flex items-center gap-1.5 sm:gap-2 select-none shadow-xs">
          <span className="font-bold text-black dark:text-white tracking-tight">Venpide Logistics Map</span>
          <span className="font-medium text-stone-700 dark:text-gray-300">• Cobertura y Despacho Moto Taxi</span>
        </div>
      </div>

      {/* 2. Tarjeta con información del hub: en móvil se ubica abajo del mapa sin taparlo; en desktop flota en la esquina izquierda */}
      <div className="relative z-20 w-full p-5 sm:p-6 md:p-7 md:absolute md:top-8 md:left-12 md:max-w-sm md:w-full bg-white dark:bg-[#12131A] md:bg-white/95 md:dark:bg-[#12131A]/95 md:backdrop-blur-md md:rounded-2xl border-t md:border border-stone-200 dark:border-stone-800 md:shadow-2xl text-stone-900 dark:text-[#E6F7F0]">
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider mb-3 border border-emerald-600/30">
          <MapPin size={11} />
          <span>Central de Despacho &amp; Flota</span>
        </div>

        <h3 className="text-base font-black text-stone-900 dark:text-[#E6F7F0] uppercase tracking-wider mb-1 font-sans">
          Hub Logístico Venpide
        </h3>
        <p className="text-stone-800 dark:text-[#B9E6D3] text-xs sm:text-sm leading-relaxed mb-4 font-medium">
          <strong className="text-stone-950 dark:text-white font-bold block text-sm">
            Base Central de Conductores y Motorizados
          </strong>
          <span className="text-[11.5px] text-stone-600 dark:text-[#76C7B2] font-semibold block mt-1">
            {isSpanish
              ? "Atención a restaurantes, comercios y usuarios con despachos inmediatos en moto taxi."
              : "Serving partner restaurants, stores, and users with instant moto taxi dispatch."}
          </span>
        </p>

        <div className="space-y-3 pt-3 border-t border-stone-200 dark:border-stone-800">
          <div>
            <h4 className="text-[11px] font-black text-stone-900 dark:text-[#E6F7F0] uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
              <Phone size={12} className="text-[#163422] dark:text-[#5EEAD4]" />
              <span>{isSpanish ? "Teléfono / Pedidos" : "Phone / Orders"}</span>
            </h4>
            <a
              href={`tel:${cleanPhone || "+13467392730"}`}
              className="text-xs sm:text-sm text-stone-800 dark:text-[#B9E6D3] hover:text-[#163422] dark:hover:text-[#5EEAD4] transition-colors font-bold"
            >
              {phone}
            </a>
          </div>

          <div>
            <h4 className="text-[11px] font-black text-stone-900 dark:text-[#E6F7F0] uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
              <Mail size={12} className="text-[#163422] dark:text-[#5EEAD4]" />
              <span>{isSpanish ? "Correo Electrónico" : "Email Address"}</span>
            </h4>
            <a
              href={`mailto:${email}`}
              className="text-xs sm:text-sm text-stone-800 dark:text-[#B9E6D3] hover:text-[#163422] dark:hover:text-[#5EEAD4] transition-colors font-semibold break-all"
            >
              {email}
            </a>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800 flex flex-col gap-2">
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=9546+Hammerly+Boulevard+Houston+TX+77080"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#163422] hover:bg-[#1B2E22] text-white py-2.5 px-4 rounded-xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 border border-[#163422]"
          >
            <MapPin size={14} />
            <span>{isSpanish ? "Cómo Llegar en Google Maps" : "Get Directions on Google Maps"}</span>
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#163422] hover:bg-[#1B2E22] dark:bg-[#5EEAD4] dark:hover:bg-[#2DD4BF] text-white dark:text-stone-950 py-2.5 px-4 rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <MessageCircle size={15} />
            <span>{isSpanish ? "Consultar por WhatsApp" : "Inquire on WhatsApp"}</span>
          </a>
        </div>
      </div>
    </section>
  );
};
