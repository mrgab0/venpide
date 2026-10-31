"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Layers,
  Pin,
  Sparkles,
  Truck,
} from "lucide-react";
import { ThemeToggle } from "@/components/shop/ThemeToggle";
import { AdminSalesNotificationListener } from "@/components/admin/AdminSalesNotificationListener";

interface AdminShellProps {
  children: React.ReactNode;
  logoutAction: () => Promise<void>;
}

export const ADMIN_NAV_ITEMS = [
  {
    href: "/admin/whatsapp",
    label: "WhatsApp CRM & Drivers",
    icon: "💬",
  },
  {
    href: "/admin/ordenes",
    label: "Órdenes & Despacho",
    icon: "🛍️",
  },
  {
    href: "/admin/productos",
    label: "Productos",
    icon: "📦",
  },
  {
    href: "/admin/sliders",
    label: "Banners",
    icon: "🖼️",
  },
  {
    href: "/admin/estadisticas",
    label: "Estadísticas",
    icon: "📊",
  },
  {
    href: "/admin/adicionales",
    label: "Adicionales",
    icon: "✨",
  },
  {
    href: "/admin/papelera",
    label: "Papelera",
    icon: "🗑️",
  },
  {
    href: "/admin/entregas",
    label: "Entregas",
    icon: "🚚",
  },
  {
    href: "/admin/doordash",
    label: "DoorDash Drive",
    icon: "🚗",
  },
  {
    href: "/admin/cupones",
    label: "Cupones",
    icon: "🎟️",
  },
  {
    href: "/admin/correos",
    label: "Correos & Webmail",
    icon: "✉️",
  },
  {
    href: "/admin/tema",
    label: "Editor de Tema",
    icon: "🎨",
  },
  {
    href: "/admin/qr",
    label: "Códigos QR",
    icon: "📱",
  },
  {
    href: "/admin/pagos",
    label: "Cuentas",
    icon: "💳",
  },
  {
    href: "/admin/seo",
    label: "SEO",
    icon: "🔍",
  },
  {
    href: "/admin/blog",
    label: "Blogger",
    icon: "✍️",
  },
  {
    href: "/admin/configuracion?tab=chatbot",
    label: "Chatbot IA",
    icon: "🤖",
  },
  {
    href: "/admin/configuracion",
    label: "Configuración",
    icon: "⚙️",
  },
];

export function AdminShell({ children, logoutAction }: AdminShellProps) {
  const pathname = usePathname();

  // Estados limpios en memoria (sin abusar de localStorage)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOverlayMode, setIsOverlayMode] = useState(false); // Modo Solapado / Flotante
  const [isOverlayOpen, setIsOverlayOpen] = useState(false); // Visibilidad en modo solapado
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Encontrar el item activo
  const activeItem = ADMIN_NAV_ITEMS.find((item) => pathname?.startsWith(item.href)) || {
    href: "/admin",
    label: "Panel Principal",
    icon: "🛵",
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0B0C10] flex text-gray-900 dark:text-gray-100 antialiased">
      {/* ========================================================================= */}
      {/* 1. BACKDROP PARA MÓVIL Y MODO SOLAPADO */}
      {/* ========================================================================= */}
      {(isMobileOpen || (isOverlayMode && isOverlayOpen)) && (
        <div
          onClick={() => {
            setIsMobileOpen(false);
            setIsOverlayOpen(false);
          }}
          className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* ========================================================================= */}
      {/* 2. PANEL LATERAL ESTILO VERCEL (SIDEBAR) */}
      {/* ========================================================================= */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white dark:bg-[#111217] border-r border-gray-200/80 dark:border-gray-800/80 transition-all duration-300 ease-in-out shadow-sm ${
          // Posicionamiento Móvil
          isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"
        } ${
          // Comportamiento Desktop según Modo Solapado o Fijado
          isOverlayMode
            ? isOverlayOpen
              ? "lg:translate-x-0 lg:w-72 lg:shadow-2xl"
              : "lg:-translate-x-full lg:w-72"
            : isCollapsed
            ? "lg:w-20"
            : "lg:w-64"
        }`}
      >
        {/* Cabecera del Sidebar con Logo e Identidad */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 flex-shrink-0">
          <Link
            href="/admin"
            className="flex items-center gap-3 overflow-hidden group select-none"
            onClick={() => {
              setIsMobileOpen(false);
              if (isOverlayMode) setIsOverlayOpen(false);
            }}
          >
            <div className="w-10 h-10 rounded-full border-2 border-emerald-500 overflow-hidden bg-white dark:bg-stone-900 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform p-0.5">
              <img
                src="/logo.png"
                alt="Venpide Logo"
                className="w-full h-full object-contain rounded-full"
              />
            </div>

            {(!isCollapsed || isOverlayMode || isMobileOpen) && (
              <div className="truncate">
                <span className="font-sans font-black text-sm text-gray-900 dark:text-white block leading-tight truncate group-hover:text-emerald-600 transition-colors">
                  Venpide Delivery
                </span>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block truncate">
                  Admin Central
                </span>
              </div>
            )}
          </Link>

          {/* Botón para cerrar en móvil o colapsar en desktop */}
          <div className="flex items-center gap-1">
            {/* Cerrar en móvil */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Cerrar panel"
            >
              <X size={18} />
            </button>

            {/* Colapsar en modo fijado (Desktop) */}
            {!isOverlayMode && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors"
                title={isCollapsed ? "Expandir panel lateral" : "Colapsar panel lateral"}
              >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            )}

            {/* Cerrar overlay en modo solapado (Desktop) */}
            {isOverlayMode && (
              <button
                onClick={() => setIsOverlayOpen(false)}
                className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors"
                title="Cerrar panel solapado"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Navegación Vertical Vercel */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setIsMobileOpen(false);
                  if (isOverlayMode) setIsOverlayOpen(false);
                }}
                title={item.label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative group select-none ${
                  isActive
                    ? "bg-pink-50/80 dark:bg-pink-950/40 text-[#B0004A] dark:text-pink-300 font-bold shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/70 dark:hover:bg-gray-800/40"
                } ${isCollapsed && !isOverlayMode ? "justify-center" : ""}`}
              >
                {/* Indicador activo lateral Vercel */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#B0004A] rounded-r-full" />
                )}

                <span className="text-base flex-shrink-0 group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>

                {(!isCollapsed || isOverlayMode || isMobileOpen) && (
                  <span className="truncate flex-1">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Pie del Sidebar: Selector de Modo, Tema y Salir */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-[#0E0F14]/60 flex flex-col gap-2 flex-shrink-0">
          {/* Botón Ver Tienda */}
          <Link
            href="/"
            target="_blank"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#B0004A] dark:text-pink-300 bg-pink-100/60 dark:bg-pink-950/60 hover:bg-pink-200/80 dark:hover:bg-pink-900/60 transition-colors border border-pink-200/80 dark:border-pink-900/50 ${
              isCollapsed && !isOverlayMode ? "justify-center" : ""
            }`}
            title="Abrir tienda en nueva pestaña"
          >
            <span className="text-sm">👁️</span>
            {(!isCollapsed || isOverlayMode || isMobileOpen) && (
              <>
                <span className="truncate flex-1">Ver Tienda</span>
                <ExternalLink size={12} className="opacity-70" />
              </>
            )}
          </Link>


          {/* Fila Inferior: Tema y Logout */}
          <div
            className={`flex items-center gap-2 ${
              isCollapsed && !isOverlayMode ? "flex-col" : "justify-between"
            }`}
          >
            <div className="flex items-center">
              <ThemeToggle />
            </div>

            <form action={logoutAction} className={isCollapsed && !isOverlayMode ? "w-full" : ""}>
              <button
                type="submit"
                className={`p-2 rounded-xl bg-gray-100 hover:bg-rose-100 dark:bg-gray-800 hover:dark:bg-rose-950/60 text-gray-600 hover:text-rose-700 dark:text-gray-300 dark:hover:text-rose-300 transition-colors flex items-center justify-center gap-2 text-xs font-bold ${
                  isCollapsed && !isOverlayMode ? "w-full" : "px-3"
                }`}
                title="Cerrar Sesión"
              >
                <LogOut size={14} />
                {(!isCollapsed || isOverlayMode || isMobileOpen) && <span>Salir</span>}
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 3. CONTENEDOR PRINCIPAL DE CONTENIDO */}
      {/* ========================================================================= */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          // Margen izquierdo cuando el sidebar está en modo fijado (Desktop)
          isOverlayMode
            ? "lg:ml-0"
            : isCollapsed
            ? "lg:ml-20"
            : "lg:ml-64"
        }`}
      >
        {/* BARRA SUPERIOR MINIMALISTA ESTILO VERCEL */}
        <header className="h-16 px-4 sm:px-6 bg-white/80 dark:bg-[#111217]/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 sticky top-0 z-30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Botón Menú en Móvil */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 transition-colors"
              aria-label="Abrir menú"
            >
              <Menu size={18} />
            </button>

            {/* Botón Abrir Menú en Modo Solapado (Desktop) */}
            {isOverlayMode && (
              <button
                onClick={() => setIsOverlayOpen(true)}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-pink-50 dark:bg-pink-950/50 border border-pink-200 dark:border-pink-900 text-[#B0004A] dark:text-pink-300 text-xs font-bold hover:bg-pink-100 transition-all shadow-sm"
                title="Abrir menú solapado"
              >
                <Menu size={15} />
                <span>Menú</span>
              </button>
            )}

            {/* Breadcrumb de Sección Activa Vercel */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-gray-400 dark:text-gray-500">Admin</span>
              <span className="text-gray-300 dark:text-gray-700">/</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold">
                <span>{activeItem.icon}</span>
                <span>{activeItem.label}</span>
              </div>
            </div>
          </div>

          {/* Accesos Rápidos en Cabecera */}
          <div className="flex items-center gap-2">
            {/* Badge de modo de visualización */}
            {isOverlayMode ? (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                <Layers size={11} /> Solapado
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                <Pin size={11} /> Fijado
              </span>
            )}

            {/* Botón directo DoorDash */}
            <Link
              href="/admin/doordash"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold border border-red-200 dark:border-red-900/60 transition-colors shadow-xs"
              title="Configuración de Encomiendas DoorDash"
            >
              <Truck size={13} className="text-red-600 dark:text-red-400" />
              <span>DoorDash</span>
            </Link>

            {/* Enlace directo Ver Tienda */}
            <Link
              href="/"
              target="_blank"
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-pink-50 dark:hover:bg-pink-950/40 text-gray-700 dark:text-gray-200 hover:text-[#B0004A] text-xs font-bold border border-gray-200 dark:border-gray-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span>Ver Tienda</span>
              <ExternalLink size={12} className="opacity-70" />
            </Link>
          </div>
        </header>

        {/* Contenido Dinámico de la Página */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        {/* Listener Global de Ventas en Vivo con Alarma Sonora y Push */}
        <AdminSalesNotificationListener />
      </div>
    </div>
  );
}
