"use client";

import { useEffect, useState, useRef } from "react";
import {
  MessageSquare,
  Send,
  Phone,
  User,
  Bike,
  Truck,
  Car,
  CheckCheck,
  Check,
  Clock,
  Settings,
  Search,
  Plus,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  X,
  Edit3,
  Trash2,
  Sparkles,
  ChevronDown,
  Info,
  Radio,
  MapPin,
  Store,
  DollarSign,
  Ban,
  UserMinus,
} from "lucide-react";
import {
  getWhatsAppChatsAction,
  getWhatsAppMessagesAction,
  sendAdminWhatsAppMessageAction,
  assignDriverToChatAction,
  unassignDriverAction,
  cancelDeliveryAction,
  updateDeliveryDetailsAction,
  updateChatStatusAction,
  getDriversListAction,
  saveDriverAction,
  deleteDriverAction,
  getMetaWhatsAppConfigAction,
  saveMetaWhatsAppConfigAction,
  simulateIncomingWhatsAppMessageAction,
} from "@/lib/actions/whatsappCrm";

export default function WhatsAppCrmPage() {
  // Conversaciones y mensajes
  const [chats, setChats] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Input de mensaje admin
  const [adminInput, setAdminInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Lista de Drivers
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [assigningDriver, setAssigningDriver] = useState(false);

  // Modales
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSimulatorModalOpen, setIsSimulatorModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isEditDeliveryModalOpen, setIsEditDeliveryModalOpen] = useState(false);

  // Estados de Operaciones de Delivery
  const [unassigningDriver, setUnassigningDriver] = useState(false);
  const [cancelReason, setCancelReason] = useState("Cliente canceló el pedido");
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [cancellingDelivery, setCancellingDelivery] = useState(false);
  const [savingDeliveryDetails, setSavingDeliveryDetails] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    orderId: "",
    restaurantName: "",
    deliveryAddress: "",
    totalAmount: "",
    notes: "",
    customerName: "",
  });

  // Estado del formulario de Driver
  const [editingDriver, setEditingDriver] = useState<any | null>(null);
  const [savingDriver, setSavingDriver] = useState(false);

  // Estado de configuración Meta
  const [metaConfig, setMetaConfig] = useState<any>({
    phoneNumberId: "",
    wabaId: "",
    accessToken: "",
    verifyToken: "venpide_webhook_token_2026",
    webhookUrl: "/api/webhook/whatsapp",
    autoForwardToDriver: true,
    autoForwardToCustomer: true,
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Estado del simulador
  const [simPhone, setSimPhone] = useState("584121234567");
  const [simName, setSimName] = useState("Carlos Cliente");
  const [simText, setSimText] = useState("Hola, buenas tardes. Quisiera saber el estatus de mi pedido.");
  const [simIsDriver, setSimIsDriver] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // =========================================================================
  // CARGA DE DATOS
  // =========================================================================

  const fetchChats = async () => {
    setLoadingChats(true);
    const res = await getWhatsAppChatsAction(filterStatus, searchTerm);
    if (res.success && res.chats) {
      setChats(res.chats);
      if (!activeChatId && res.chats.length > 0) {
        setActiveChatId(res.chats[0].chatId);
      }
    }
    setLoadingChats(false);
  };

  const fetchDrivers = async () => {
    const res = await getDriversListAction();
    if (res.success && res.drivers) {
      setDrivers(res.drivers);
    }
  };

  const fetchMetaConfig = async () => {
    const res = await getMetaWhatsAppConfigAction();
    if (res.success && res.config) {
      setMetaConfig(res.config);
    }
  };

  useEffect(() => {
    fetchChats();
    fetchDrivers();
    fetchMetaConfig();
  }, [filterStatus]);

  useEffect(() => {
    if (!activeChatId) return;
    setLoadingMessages(true);
    getWhatsAppMessagesAction(activeChatId).then((res) => {
      if (res.success && res.messages) {
        setMessages(res.messages);
      }
      setLoadingMessages(false);
      setTimeout(() => scrollToBottom(), 100);
    });
  }, [activeChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Conversación seleccionada actualmente
  const currentChat = chats.find((c) => c.chatId === activeChatId);

  // =========================================================================
  // ACCIONES DE MENSAJERÍA
  // =========================================================================

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminInput.trim() || !activeChatId || sendingMsg) return;

    setSendingMsg(true);
    const textToSend = adminInput.trim();
    setAdminInput("");

    // Optimistic UI
    const optimisticMsg = {
      _id: `temp_${Date.now()}`,
      chatId: activeChatId,
      senderType: "admin",
      senderName: "Admin Venpide",
      text: textToSend,
      createdAt: new Date().toISOString(),
      status: "sent",
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(), 50);

    const res = await sendAdminWhatsAppMessageAction(activeChatId, textToSend);
    setSendingMsg(false);

    if (res.success) {
      // Refrescar mensajes y chats
      getWhatsAppMessagesAction(activeChatId).then((m) => {
        if (m.success && m.messages) setMessages(m.messages);
        scrollToBottom();
      });
      fetchChats();
    } else {
      alert("Error al enviar mensaje: " + res.error);
    }
  };

  const handleAssignDriver = async () => {
    if (!activeChatId || !selectedDriverId || assigningDriver) return;
    setAssigningDriver(true);
    const res = await assignDriverToChatAction(activeChatId, selectedDriverId);
    setAssigningDriver(false);
    if (res.success) {
      setSelectedDriverId("");
      fetchChats();
      if (activeChatId) {
        getWhatsAppMessagesAction(activeChatId).then((m) => {
          if (m.success && m.messages) setMessages(m.messages);
          scrollToBottom();
        });
      }
    } else {
      alert("Error al asignar conductor: " + res.error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!activeChatId) return;
    const res = await updateChatStatusAction(activeChatId, newStatus);
    if (res.success) {
      fetchChats();
      getWhatsAppMessagesAction(activeChatId).then((m) => {
        if (m.success && m.messages) setMessages(m.messages);
      });
    }
  };

  const openEditDeliveryModal = () => {
    if (!currentChat) return;
    setDeliveryForm({
      orderId: currentChat.orderId || "",
      restaurantName: currentChat.restaurantName || "",
      deliveryAddress: currentChat.deliveryAddress || "",
      totalAmount: currentChat.totalAmount !== undefined && currentChat.totalAmount !== null ? String(currentChat.totalAmount) : "",
      notes: currentChat.notes || "",
      customerName: currentChat.customerName || "",
    });
    setIsEditDeliveryModalOpen(true);
  };

  const handleUnassignDriver = async () => {
    if (!activeChatId || unassigningDriver) return;
    if (!confirm("¿Deseas desasignar al conductor? El repartidor quedará disponible para otras carreras.")) return;
    setUnassigningDriver(true);
    const res = await unassignDriverAction(activeChatId);
    setUnassigningDriver(false);
    if (res.success) {
      fetchChats();
      fetchDrivers();
      getWhatsAppMessagesAction(activeChatId).then((m) => {
        if (m.success && m.messages) setMessages(m.messages);
        scrollToBottom();
      });
    } else {
      alert("Error al desasignar conductor: " + res.error);
    }
  };

  const handleCancelDelivery = async () => {
    if (!activeChatId || cancellingDelivery) return;
    const finalReason = cancelReason === "Otro" ? customCancelReason.trim() : cancelReason;
    if (!finalReason) {
      alert("Por favor indica el motivo de la cancelación.");
      return;
    }
    setCancellingDelivery(true);
    const res = await cancelDeliveryAction(activeChatId, finalReason);
    setCancellingDelivery(false);
    if (res.success) {
      setIsCancelModalOpen(false);
      setCustomCancelReason("");
      fetchChats();
      fetchDrivers();
      getWhatsAppMessagesAction(activeChatId).then((m) => {
        if (m.success && m.messages) setMessages(m.messages);
        scrollToBottom();
      });
    } else {
      alert("Error al cancelar delivery: " + res.error);
    }
  };

  const handleSaveDeliveryDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || savingDeliveryDetails) return;
    setSavingDeliveryDetails(true);
    const res = await updateDeliveryDetailsAction(activeChatId, {
      orderId: deliveryForm.orderId,
      restaurantName: deliveryForm.restaurantName,
      deliveryAddress: deliveryForm.deliveryAddress,
      totalAmount: deliveryForm.totalAmount ? Number(deliveryForm.totalAmount) : 0,
      notes: deliveryForm.notes,
      customerName: deliveryForm.customerName,
    });
    setSavingDeliveryDetails(false);
    if (res.success) {
      setIsEditDeliveryModalOpen(false);
      fetchChats();
      getWhatsAppMessagesAction(activeChatId).then((m) => {
        if (m.success && m.messages) setMessages(m.messages);
        scrollToBottom();
      });
    } else {
      alert("Error al guardar datos de delivery: " + res.error);
    }
  };

  // =========================================================================
  // GESTIÓN DE CONDUCTORES
  // =========================================================================

  const handleSaveDriver = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingDriver(true);
    const formData = new FormData(e.currentTarget);
    const driverPayload: any = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      vehicleType: formData.get("vehicleType") as string,
      plate: formData.get("plate") as string,
      status: formData.get("status") as string,
      notes: formData.get("notes") as string,
    };
    if (editingDriver?._id) {
      driverPayload._id = editingDriver._id;
    }

    const res = await saveDriverAction(driverPayload);
    setSavingDriver(false);
    if (res.success) {
      setIsDriverModalOpen(false);
      setEditingDriver(null);
      fetchDrivers();
    } else {
      alert("Error: " + res.error);
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este conductor?")) return;
    const res = await deleteDriverAction(id);
    if (res.success) {
      fetchDrivers();
    } else {
      alert("Error al eliminar conductor");
    }
  };

  // =========================================================================
  // CONFIGURACIÓN META
  // =========================================================================

  const handleSaveConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingConfig(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      phoneNumberId: formData.get("phoneNumberId") as string,
      wabaId: formData.get("wabaId") as string,
      accessToken: formData.get("accessToken") as string,
      verifyToken: formData.get("verifyToken") as string,
      autoForwardToDriver: formData.get("autoForwardToDriver") === "on",
      autoForwardToCustomer: formData.get("autoForwardToCustomer") === "on",
    };
    const res = await saveMetaWhatsAppConfigAction(payload);
    setSavingConfig(false);
    if (res.success) {
      setIsConfigModalOpen(false);
      fetchMetaConfig();
      alert("Configuración de Meta WhatsApp API guardada exitosamente.");
    } else {
      alert("Error al guardar configuración: " + res.error);
    }
  };

  // =========================================================================
  // SIMULADOR DE PRUEBAS
  // =========================================================================

  const handleRunSimulator = async () => {
    if (!simPhone || !simText || simulating) return;
    setSimulating(true);
    const res = await simulateIncomingWhatsAppMessageAction({
      fromPhone: simPhone,
      customerName: simName,
      text: simText,
      isDriver: simIsDriver,
    });
    setSimulating(false);
    if (res.success) {
      setIsSimulatorModalOpen(false);
      fetchChats();
      if (activeChatId) {
        getWhatsAppMessagesAction(activeChatId).then((m) => {
          if (m.success && m.messages) setMessages(m.messages);
          scrollToBottom();
        });
      }
    } else {
      alert("Error en simulador: " + res.error);
    }
  };

  // Plantillas de respuesta rápida
  const quickReplies = [
    "🛵 ¡Hola! Tu pedido ya está asignado y tu repartidor va en camino.",
    "📍 El conductor ha llegado a tu dirección. Por favor sal a recibir.",
    "✅ Pedido confirmado con el restaurante. Tiempo estimado: 25-35 minutos.",
    "💳 ¿Podrías enviarnos la captura o número de referencia del pago?",
    "🏍️ Hola conductor, por favor confirma cuando recojas el paquete en el local.",
  ];

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-10">
      {/* ========================================================================= */}
      {/* 1. CABECERA PRINCIPAL CON ESTADÍSTICAS Y BOTONES DE CONTROL */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#12131A] p-5 rounded-2xl border border-gray-200/80 dark:border-stone-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <MessageSquare size={22} />
            </span>
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                WhatsApp CRM & Despacho de Repartidores
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  Meta Cloud API
                </span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-stone-400">
                Central de mensajería unificada para clientes, conductores de moto taxi y administradores de Venpide.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Flota de Drivers */}
          <button
            onClick={() => {
              setEditingDriver(null);
              setIsDriverModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-gray-800 dark:text-gray-200 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Bike size={15} className="text-emerald-600 dark:text-emerald-400" />
            <span>Conductores ({drivers.length})</span>
          </button>

          {/* Botón Simulador */}
          <button
            onClick={() => setIsSimulatorModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Sparkles size={15} />
            <span>Simulador de Pruebas</span>
          </button>

          {/* Botón Configuración Meta */}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-black dark:bg-stone-700 dark:hover:bg-stone-600 text-white flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <Settings size={15} />
            <span>Configurar Meta API</span>
          </button>

          {/* Recargar */}
          <button
            onClick={() => {
              fetchChats();
              fetchDrivers();
            }}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-stone-800 text-gray-600 dark:text-stone-300 transition-colors"
            title="Recargar conversaciones"
          >
            <RefreshCw size={16} className={loadingChats ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PANEL PRINCIPAL EN 3 COLUMNAS: CHATS | VENTANA EN VIVO | LOGÍSTICA */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-220px)] min-h-[650px]">
        {/* ======================================================================= */}
        {/* COLUMNA 1: LISTADO DE CHATS (3 Columnas en lg) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-3 bg-white dark:bg-[#12131A] rounded-2xl border border-gray-200/80 dark:border-stone-800 flex flex-col overflow-hidden shadow-sm">
          {/* Barra de Búsqueda y Filtros */}
          <div className="p-3 border-b border-gray-100 dark:border-stone-800 space-y-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchChats()}
                placeholder="Buscar cliente, tel, orden..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-stone-900/70 border border-gray-200 dark:border-stone-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Pestañas de Filtro */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
              {[
                { id: "all", label: "Todos" },
                { id: "open", label: "Abiertos" },
                { id: "assigned", label: "Asignados" },
                { id: "in_delivery", label: "En Ruta" },
                { id: "delivered", label: "Entregados" },
                { id: "cancelled", label: "Cancelados" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${
                    filterStatus === tab.id
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-stone-300 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Conversaciones */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-stone-800/60">
            {loadingChats ? (
              <div className="p-8 text-center text-xs text-gray-400">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-emerald-500" />
                Cargando conversaciones...
              </div>
            ) : chats.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                <MessageSquare size={24} className="mx-auto text-gray-300 dark:text-stone-700" />
                <p>No hay conversaciones con este filtro.</p>
                <button
                  onClick={() => setIsSimulatorModalOpen(true)}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  Simular un mensaje nuevo 💬
                </button>
              </div>
            ) : (
              chats.map((chat) => {
                const isActive = chat.chatId === activeChatId;
                return (
                  <div
                    key={chat.chatId}
                    onClick={() => setActiveChatId(chat.chatId)}
                    className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 relative select-none ${
                      isActive
                        ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-l-4 border-emerald-600"
                        : "hover:bg-gray-50 dark:hover:bg-stone-900/40"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-sm">
                      {chat.customerName?.charAt(0)?.toUpperCase() || "C"}
                    </div>

                    {/* Contenido Resumen */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                          {chat.customerName}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {chat.lastMessageAt
                            ? new Date(chat.lastMessageAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-500 dark:text-stone-400 truncate mb-1">
                        {chat.lastSender === "admin" && <span className="text-emerald-600 font-semibold">Tú: </span>}
                        {chat.lastSender === "driver" && <span className="text-blue-600 font-semibold">🛵 Driver: </span>}
                        {chat.lastMessage || "Sin mensajes"}
                      </p>

                      {/* Chips: Conductor y Estado */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {chat.assignedDriver ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                            <Bike size={10} /> {chat.assignedDriver.name}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                            Sin conductor
                          </span>
                        )}

                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            chat.status === "cancelled"
                              ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                              : chat.status === "open"
                              ? "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                              : chat.status === "assigned"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                              : chat.status === "in_delivery"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                        >
                          {chat.status === "cancelled" ? "Cancelado" : chat.status}
                        </span>
                      </div>
                    </div>

                    {/* Badge sin leer */}
                    {chat.unreadAdminCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {chat.unreadAdminCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* COLUMNA 2: VENTANA DE CONVERSACIÓN EN VIVO (6 Columnas en lg) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-6 bg-white dark:bg-[#12131A] rounded-2xl border border-gray-200/80 dark:border-stone-800 flex flex-col overflow-hidden shadow-sm">
          {currentChat ? (
            <>
              {/* Encabezado del Chat */}
              <div className="p-3.5 border-b border-gray-100 dark:border-stone-800 flex items-center justify-between gap-3 bg-gray-50/60 dark:bg-[#151720]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                    {currentChat.customerName?.charAt(0)?.toUpperCase() || "C"}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-sm text-gray-900 dark:text-white truncate flex items-center gap-2">
                      {currentChat.customerName}
                      <a
                        href={`https://wa.me/${currentChat.customerPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-400 hover:text-emerald-600 transition-colors"
                        title="Abrir en WhatsApp Web directo"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </h2>
                    <p className="text-[11px] text-gray-500 dark:text-stone-400 font-mono">
                      +{currentChat.customerPhone}
                    </p>
                  </div>
                </div>

                {/* Selector rápido de estatus */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-gray-400 hidden sm:inline">Estado:</span>
                  <select
                    value={currentChat.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="open">Abierto (Pendiente)</option>
                    <option value="assigned">Asignado a Driver</option>
                    <option value="in_delivery">En Entrega / En Ruta</option>
                    <option value="delivered">Entregado</option>
                    <option value="closed">Cerrado / Finalizado</option>
                    <option value="cancelled">Cancelado ❌</option>
                  </select>
                </div>
              </div>

              {/* Alerta de Cancelación si aplica */}
              {currentChat.status === "cancelled" && (
                <div className="bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-900/60 p-3 flex items-center justify-between text-xs text-red-800 dark:text-red-200">
                  <div className="flex items-center gap-2">
                    <Ban size={16} className="text-red-600 shrink-0" />
                    <div>
                      <strong className="font-bold">Delivery Cancelado:</strong>{" "}
                      <span>{currentChat.cancellationReason || "Cancelado por administración"}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100">
                    Cancelado
                  </span>
                </div>
              )}

              {/* Contenedor de Mensajes */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#EFEAE2]/30 dark:bg-[#0B0C10]">
                {loadingMessages ? (
                  <div className="text-center py-12 text-xs text-gray-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-emerald-500" />
                    Cargando historial de mensajes...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-400">
                    No hay mensajes en esta conversación aún. Escribe abajo para iniciar.
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isCustomer = msg.senderType === "customer";
                    const isDriver = msg.senderType === "driver";
                    const isAdmin = msg.senderType === "admin";
                    const isSystem = msg.senderType === "system";

                    if (isSystem) {
                      return (
                        <div key={msg._id || idx} className="flex justify-center my-2">
                          <span className="bg-gray-200/80 dark:bg-stone-800 text-gray-600 dark:text-stone-300 text-[10px] font-semibold px-3 py-1 rounded-full shadow-xs text-center max-w-md">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg._id || idx}
                        className={`flex flex-col ${
                          isAdmin ? "items-end" : "items-start"
                        }`}
                      >
                        {/* Etiqueta del Remitente */}
                        <div className="flex items-center gap-1.5 mb-0.5 px-1">
                          {isCustomer && (
                            <span className="text-[10px] font-bold text-gray-500 dark:text-stone-400 flex items-center gap-1">
                              <User size={10} /> {msg.senderName || "Cliente"}
                            </span>
                          )}
                          {isDriver && (
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <Bike size={11} /> {msg.senderName || "Conductor"}
                            </span>
                          )}
                          {isAdmin && (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <ShieldCheck size={11} /> Central Venpide (Admin)
                            </span>
                          )}
                        </div>

                        {/* Burbuja del Mensaje */}
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-xs text-xs leading-relaxed ${
                            isAdmin
                              ? "bg-emerald-600 text-white rounded-tr-none"
                              : isDriver
                              ? "bg-blue-50 dark:bg-blue-950/50 text-blue-950 dark:text-blue-100 border border-blue-200 dark:border-blue-900 rounded-tl-none"
                              : "bg-white dark:bg-stone-800 text-gray-900 dark:text-stone-100 border border-gray-200/80 dark:border-stone-700/80 rounded-tl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                              isAdmin ? "text-emerald-200" : "text-gray-400 dark:text-stone-500"
                            }`}
                          >
                            <span>
                              {msg.createdAt
                                ? new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>
                            {isAdmin && <CheckCheck size={11} />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Plantillas Rápidas */}
              <div className="px-3 pt-2 bg-gray-50 dark:bg-[#151720] border-t border-gray-100 dark:border-stone-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                <span className="text-[10px] font-bold text-gray-400 shrink-0">Respuestas rápidas:</span>
                {quickReplies.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => setAdminInput(r)}
                    className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 text-gray-700 dark:text-stone-300 hover:border-emerald-500 whitespace-nowrap transition-colors"
                  >
                    {r.slice(0, 32)}...
                  </button>
                ))}
              </div>

              {/* Input y Envío */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white dark:bg-[#12131A] border-t border-gray-100 dark:border-stone-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  placeholder="Escribe como Administrador (llega al cliente y conductor)..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  disabled={sendingMsg}
                />
                <button
                  type="submit"
                  disabled={!adminInput.trim() || sendingMsg}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Send size={14} className={sendingMsg ? "animate-pulse" : ""} />
                  <span className="hidden sm:inline">Enviar</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <MessageSquare size={48} className="text-gray-300 dark:text-stone-700 mb-3" />
              <h3 className="font-bold text-sm text-gray-800 dark:text-stone-200">
                Selecciona una conversación
              </h3>
              <p className="text-xs max-w-sm mt-1">
                Elige un chat de la lista izquierda para monitorear la comunicación en tiempo real entre cliente, driver y central.
              </p>
            </div>
          )}
        </div>

        {/* ======================================================================= */}
        {/* COLUMNA 3: LOGÍSTICA DE DRIVERS Y CONTEXTO DEL PEDIDO (3 Columnas en lg) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-3 space-y-4 overflow-y-auto">
          {/* Tarjeta de Conductor Asignado */}
          <div className="bg-white dark:bg-[#12131A] p-4 rounded-2xl border border-gray-200/80 dark:border-stone-800 shadow-sm space-y-3">
            <h3 className="font-bold text-xs text-gray-900 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Bike size={15} className="text-emerald-600 dark:text-emerald-400" />
                Conductor Asignado
              </span>
              {currentChat?.assignedDriver && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  Activo
                </span>
              )}
            </h3>

            {currentChat?.assignedDriver ? (
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-900 dark:text-blue-200">
                    {currentChat.assignedDriver.name}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400">
                    {currentChat.assignedDriver.vehicleType}
                  </span>
                </div>
                <div className="text-[11px] text-gray-600 dark:text-stone-400 font-mono">
                  📞 +{currentChat.assignedDriver.phone}
                </div>
                {currentChat.assignedDriver.plate && (
                  <div className="text-[10px] text-gray-500 dark:text-stone-400">
                    Placa: <strong className="font-mono text-gray-700 dark:text-stone-300">{currentChat.assignedDriver.plate}</strong>
                  </div>
                )}
                <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                  <a
                    href={`https://wa.me/${currentChat.assignedDriver.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <MessageSquare size={10} /> WhatsApp
                  </a>
                  <a
                    href={`tel:${currentChat.assignedDriver.phone}`}
                    className="py-1.5 px-2.5 rounded-lg bg-gray-200 dark:bg-stone-800 text-gray-700 dark:text-stone-300 text-[10px] font-bold hover:bg-gray-300 transition-colors"
                    title="Llamar"
                  >
                    <Phone size={10} />
                  </a>
                  <button
                    onClick={handleUnassignDriver}
                    disabled={unassigningDriver}
                    className="py-1.5 px-2 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Desasignar conductor de esta entrega"
                  >
                    <UserMinus size={11} /> {unassigningDriver ? "..." : "Quitar"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-center">
                <AlertCircle size={20} className="mx-auto text-amber-500 mb-1" />
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  Sin conductor asignado
                </p>
                <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                  Asigna un motorizado de la flota para comenzar el despacho.
                </p>
              </div>
            )}

            {/* Asignar o Reasignar Conductor */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-bold text-gray-400 block uppercase">
                {currentChat?.assignedDriver ? "🔄 Reasignar a otro conductor:" : "🛵 Asignar de la Flota:"}
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="">
                    {currentChat?.assignedDriver ? "Selecciona nuevo chofer..." : "Selecciona un chofer..."}
                  </option>
                  {drivers.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.vehicleType.toUpperCase()}) - {d.status === "available" ? "🟢 Disponible" : "🟡 Ocupado"}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignDriver}
                  disabled={!selectedDriverId || assigningDriver}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {assigningDriver ? "..." : currentChat?.assignedDriver ? "Reasignar" : "Asignar"}
                </button>
              </div>
            </div>
          </div>

          {/* Tarjeta de Orden y Contexto */}
          <div className="bg-white dark:bg-[#12131A] p-4 rounded-2xl border border-gray-200/80 dark:border-stone-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                <Truck size={15} className="text-emerald-600 dark:text-emerald-400" />
                Logística del Pedido
              </h3>
              <button
                onClick={openEditDeliveryModal}
                disabled={!currentChat}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 cursor-pointer"
              >
                <Edit3 size={12} /> Modificar
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-stone-800">
                <span className="text-gray-500 dark:text-stone-400">Orden Ref:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {currentChat?.orderId || "VNP-DIRECTO"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-stone-800">
                <span className="text-gray-500 dark:text-stone-400 flex items-center gap-1">
                  <Store size={12} /> Restaurante / Local:
                </span>
                <span className="font-bold text-gray-900 dark:text-white text-right truncate max-w-[140px]">
                  {currentChat?.restaurantName || "No especificado"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-stone-800">
                <span className="text-gray-500 dark:text-stone-400 flex items-center gap-1">
                  <MapPin size={12} /> Dirección Entrega:
                </span>
                <span className="font-medium text-gray-800 dark:text-stone-200 text-right truncate max-w-[140px]">
                  {currentChat?.deliveryAddress || "Coordinar por chat"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-stone-800">
                <span className="text-gray-500 dark:text-stone-400 flex items-center gap-1">
                  <DollarSign size={12} /> Monto / Cobro:
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ${currentChat?.totalAmount !== undefined && currentChat?.totalAmount !== null ? currentChat.totalAmount : 0}
                </span>
              </div>
              {currentChat?.notes && (
                <div className="py-1 border-b border-gray-100 dark:border-stone-800">
                  <span className="text-gray-500 dark:text-stone-400 block text-[10px] uppercase font-bold">Notas de Central:</span>
                  <p className="text-gray-700 dark:text-stone-300 text-[11px] mt-0.5">{currentChat.notes}</p>
                </div>
              )}
              {currentChat?.cancellationReason && (
                <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-[11px] text-red-800 dark:text-red-300">
                  <strong>Motivo Cancelación:</strong> {currentChat.cancellationReason}
                </div>
              )}
            </div>

            {/* Botones de acción logística */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-stone-800">
              <button
                onClick={openEditDeliveryModal}
                disabled={!currentChat}
                className="w-full py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 size={13} /> Modificar Datos del Pedido
              </button>

              {currentChat && currentChat.status !== "cancelled" && (
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Ban size={13} /> Cancelar Delivery
                </button>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-stone-900/60 border border-gray-100 dark:border-stone-800 text-[11px] text-gray-600 dark:text-stone-400 leading-relaxed">
              💡 <strong>Regla inteligente:</strong> Cuando el conductor responde al WhatsApp oficial de Venpide, el mensaje se redirige al cliente y se registra en este panel automáticamente.
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: GESTIÓN DE CONDUCTORES / MOTO TAXIS */}
      {/* ========================================================================= */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-gray-200 dark:border-stone-800 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-stone-800 pb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bike size={18} className="text-emerald-600" />
                Flota de Conductores & Moto Taxis Venpide
              </h2>
              <button
                onClick={() => {
                  setIsDriverModalOpen(false);
                  setEditingDriver(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulario Agregar/Editar Driver */}
            <form onSubmit={handleSaveDriver} className="p-4 bg-gray-50 dark:bg-stone-900/60 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-gray-800 dark:text-white">
                {editingDriver ? "Editar Conductor" : "Registrar Nuevo Conductor"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Nombre Completo</label>
                  <input
                    name="name"
                    defaultValue={editingDriver?.name || ""}
                    required
                    placeholder="Ej. Juan Pérez"
                    className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Teléfono (WhatsApp)</label>
                  <input
                    name="phone"
                    defaultValue={editingDriver?.phone || ""}
                    required
                    placeholder="Ej. 584121234567"
                    className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Tipo de Vehículo</label>
                  <select
                    name="vehicleType"
                    defaultValue={editingDriver?.vehicleType || "moto"}
                    className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-900 dark:text-white"
                  >
                    <option value="moto">Moto Taxi 🏍️</option>
                    <option value="carro">Carro / Taxi 🚗</option>
                    <option value="bicicleta">Bicicleta 🚲</option>
                    <option value="camioneta">Camioneta / Carga 🚚</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Placa / Matrícula</label>
                  <input
                    name="plate"
                    defaultValue={editingDriver?.plate || ""}
                    placeholder="Ej. AB123CD"
                    className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-900 dark:text-white uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Disponibilidad</label>
                  <select
                    name="status"
                    defaultValue={editingDriver?.status || "available"}
                    className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-900 dark:text-white"
                  >
                    <option value="available">🟢 Disponible para carreras</option>
                    <option value="busy">🟡 En Servicio (Ocupado)</option>
                    <option value="offline">⚪ Desconectado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Notas internas</label>
                  <input
                    name="notes"
                    defaultValue={editingDriver?.notes || ""}
                    placeholder="Turno mañana, zona norte..."
                    className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {editingDriver && (
                  <button
                    type="button"
                    onClick={() => setEditingDriver(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-200 dark:bg-stone-700 text-gray-700 dark:text-stone-300"
                  >
                    Cancelar Edición
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingDriver}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                >
                  {savingDriver ? "Guardando..." : editingDriver ? "Guardar Cambios" : "Registrar Conductor"}
                </button>
              </div>
            </form>

            {/* Listado de Conductores Existentes */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase">Lista de Conductores ({drivers.length})</h4>
              <div className="divide-y divide-gray-100 dark:divide-stone-800 border border-gray-100 dark:border-stone-800 rounded-xl overflow-hidden">
                {drivers.map((d) => (
                  <div key={d._id} className="p-3 flex items-center justify-between gap-3 bg-white dark:bg-stone-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                        {d.vehicleType === "moto" ? "🏍️" : d.vehicleType === "carro" ? "🚗" : "🚲"}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          {d.name}
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              d.status === "available"
                                ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"
                                : d.status === "busy"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                                : "bg-gray-100 text-gray-500 dark:bg-stone-800"
                            }`}
                          >
                            {d.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-stone-400 font-mono">
                          +{d.phone} {d.plate && `• Placa: ${d.plate}`} • Carreras: {d.totalDeliveries || 0}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingDriver(d)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors"
                        title="Editar conductor"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteDriver(d._id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        title="Eliminar conductor"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIGURACIÓN META CLOUD API */}
      {/* ========================================================================= */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-gray-200 dark:border-stone-800 max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-stone-800 pb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings size={18} className="text-emerald-600" />
                Configuración Meta WhatsApp Cloud API
              </h2>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <p className="font-bold">Instrucciones para configurar en Meta for Developers:</p>
              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                1. En tu App de Meta, ve a <strong>WhatsApp &gt; Configuration</strong>.<br />
                2. Configura la URL del Webhook: <code className="bg-white/80 dark:bg-stone-900 px-1 py-0.5 rounded font-mono font-bold">https://tu-dominio.com/api/webhook/whatsapp</code><br />
                3. Ingresa el <strong>Verify Token</strong> configurado abajo y suscribe al campo <code className="bg-white/80 dark:bg-stone-900 px-1 py-0.5 rounded font-mono font-bold">messages</code>.
              </p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Phone Number ID</label>
                <input
                  name="phoneNumberId"
                  defaultValue={metaConfig.phoneNumberId || ""}
                  placeholder="Ej. 106592837492019"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">WhatsApp Business Account ID (WABA ID)</label>
                <input
                  name="wabaId"
                  defaultValue={metaConfig.wabaId || ""}
                  placeholder="Ej. 104928301928301"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Permanent Access Token (Bearer)</label>
                <textarea
                  name="accessToken"
                  defaultValue={metaConfig.accessToken || ""}
                  rows={3}
                  placeholder="EAA..."
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Webhook Verify Token</label>
                <input
                  name="verifyToken"
                  defaultValue={metaConfig.verifyToken || "venpide_webhook_token_2026"}
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-stone-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="autoForwardToDriver"
                    defaultChecked={metaConfig.autoForwardToDriver !== false}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-medium text-gray-800 dark:text-stone-200">
                    Reenviar mensajes del cliente automáticamente al WhatsApp del conductor asignado
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="autoForwardToCustomer"
                    defaultChecked={metaConfig.autoForwardToCustomer !== false}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-medium text-gray-800 dark:text-stone-200">
                    Reenviar respuestas del conductor al WhatsApp del cliente
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-stone-800 text-gray-700 dark:text-stone-300"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                >
                  {savingConfig ? "Guardando..." : "Guardar Credenciales"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SIMULADOR DE PRUEBAS INTERACTIVO */}
      {/* ========================================================================= */}
      {isSimulatorModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-gray-200 dark:border-stone-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-stone-800 pb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles size={18} className="text-purple-600" />
                Simulador de Mensajes WhatsApp
              </h2>
              <button onClick={() => setIsSimulatorModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-stone-400">
              Prueba el comportamiento completo del CRM (notificaciones, hilos y asignación de drivers) sin necesidad de conectar Meta API aún.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">¿Quién envía el mensaje?</label>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSimIsDriver(false);
                      setSimPhone("584121234567");
                      setSimName("Carlos Cliente");
                      setSimText("Hola, buenas tardes. Quisiera saber el estatus de mi pedido.");
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      !simIsDriver
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                        : "bg-gray-100 dark:bg-stone-800 border-transparent text-gray-600"
                    }`}
                  >
                    👤 Un Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimIsDriver(true);
                      const activeDriver = drivers[0];
                      if (activeDriver) {
                        setSimPhone(activeDriver.phone);
                        setSimName(activeDriver.name);
                      }
                      setSimText("Ya estoy en el restaurante retirando la comida 🛵.");
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      simIsDriver
                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300"
                        : "bg-gray-100 dark:bg-stone-800 border-transparent text-gray-600"
                    }`}
                  >
                    🛵 Un Conductor
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Teléfono remitente</label>
                <input
                  type="text"
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white font-mono"
                />
              </div>

              {!simIsDriver && (
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Nombre del Cliente</label>
                  <input
                    type="text"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Texto del Mensaje</label>
                <textarea
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSimulatorModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-stone-800 text-gray-700 dark:text-stone-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRunSimulator}
                  disabled={simulating}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer"
                >
                  {simulating ? "Simulando..." : "Simular Mensaje Entrante 🚀"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: MODIFICAR DATOS DEL PEDIDO / DELIVERY */}
      {/* ========================================================================= */}
      {isEditDeliveryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-gray-200 dark:border-stone-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-stone-800 pb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit3 size={18} className="text-emerald-600" />
                Modificar Logística del Pedido
              </h2>
              <button
                onClick={() => setIsEditDeliveryModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDeliveryDetails} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Nombre Cliente</label>
                  <input
                    type="text"
                    value={deliveryForm.customerName}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, customerName: e.target.value })}
                    placeholder="Ej. María Pérez"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Orden Ref / Factura</label>
                  <input
                    type="text"
                    value={deliveryForm.orderId}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, orderId: e.target.value })}
                    placeholder="Ej. VNP-8492"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Restaurante / Comercio (Punto de retiro)</label>
                <input
                  type="text"
                  value={deliveryForm.restaurantName}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, restaurantName: e.target.value })}
                  placeholder="Ej. Burger House Centro"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Dirección de Entrega (Destino)</label>
                <textarea
                  value={deliveryForm.deliveryAddress}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryAddress: e.target.value })}
                  rows={2}
                  placeholder="Ej. Av. Principal, Res. El Parque, Piso 3, Apto 3B"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Monto Total / Tarifa ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={deliveryForm.totalAmount}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, totalAmount: e.target.value })}
                    placeholder="Ej. 12.50"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Notas internas de despacho</label>
                  <input
                    type="text"
                    value={deliveryForm.notes}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                    placeholder="Ej. Cobrar punto de venta"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300">
                ℹ️ Si hay un conductor asignado, recibirá una alerta automática en su WhatsApp con los datos actualizados.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditDeliveryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-stone-800 text-gray-700 dark:text-stone-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDeliveryDetails}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                >
                  {savingDeliveryDetails ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CANCELAR DELIVERY */}
      {/* ========================================================================= */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-gray-200 dark:border-stone-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-stone-800 pb-3">
              <h2 className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <Ban size={18} />
                Cancelar Delivery
              </h2>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-800 dark:text-red-200 space-y-1">
              <p className="font-bold">⚠️ Consecuencias de la cancelación:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-700 dark:text-red-300">
                <li>El conductor asignado quedará libre inmediatamente.</li>
                <li>Se registrará el evento en la auditoría del chat.</li>
                <li>Se notificará al cliente y conductor vía WhatsApp.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Selecciona el Motivo:</label>
                <div className="space-y-1.5 mt-1.5">
                  {[
                    "Cliente canceló el pedido",
                    "Restaurante cerrado o sin existencias",
                    "Sin conductores disponibles en la zona",
                    "Dirección de entrega fuera de cobertura",
                    "Pedido duplicado o de prueba",
                    "Otro",
                  ].map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium border cursor-pointer transition-colors ${
                        cancelReason === reason
                          ? "bg-red-50 dark:bg-red-950/40 border-red-500 text-red-900 dark:text-red-200"
                          : "bg-gray-50 dark:bg-stone-900 border-gray-200 dark:border-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-100"
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancelReasonOption"
                        checked={cancelReason === reason}
                        onChange={() => setCancelReason(reason)}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {cancelReason === "Otro" && (
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Especifica el motivo:</label>
                  <textarea
                    value={customCancelReason}
                    onChange={(e) => setCustomCancelReason(e.target.value)}
                    rows={2}
                    placeholder="Escribe el motivo detallado..."
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white mt-1"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-stone-800 text-gray-700 dark:text-stone-300 cursor-pointer"
              >
                Regresar
              </button>
              <button
                type="button"
                onClick={handleCancelDelivery}
                disabled={cancellingDelivery || (cancelReason === "Otro" && !customCancelReason.trim())}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
              >
                {cancellingDelivery ? "Cancelando..." : "Confirmar Cancelación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
