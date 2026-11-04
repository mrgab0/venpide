"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createBulkAddons,
  updateBulkAddonBatch,
  publishBulkAddonBatch,
  deleteAddon
} from "@/lib/actions/addon";
import {
  Upload,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Layers,
  Image as ImageIcon,
  Package,
  Wand2,
  X,
  Link as LinkIcon,
  Sparkles,
  Rocket,
  Clock,
  Calendar,
  DollarSign,
  Tag,
  AlertCircle,
  RefreshCw
} from "lucide-react";

const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "public_YuXO1v+TwY0jYouCF4REzzh/MD0=";

const CATEGORIES = [
  "Chocolates & Dulces",
  "Peluches & Globos",
  "Personalización & Tarjetas",
  "Decoración & Lazos",
  "Colores & Papeles",
  "Otros"
];

const ADDON_TYPES = [
  { value: "checkbox", label: "Selección Simple (Checkbox)" },
  { value: "select", label: "Opciones Múltiples (Color, tipo, etc.)" },
  { value: "text", label: "Mensaje de Dedicatoria (Texto)" }
];

interface UploadDraftItem {
  id: string;
  name: string;
  price: number;
  category: string;
  isCustomCategory?: boolean;
  description: string;
  image: string;
  type: "checkbox" | "text" | "select";
  optionsInput: string;
}

interface UploadQueueItem {
  id: string;
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  errorMessage?: string;
}

export default function CargaEnMasaAdicionalesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"step1" | "step2">("step1");

  // Step 1 State: Subida masiva de imágenes y cola de progreso
  const [draftItems, setDraftItems] = useState<UploadDraftItem[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isSavingPreAgregated, setIsSavingPreAgregated] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [showManualUrlModal, setShowManualUrlModal] = useState(false);
  const filesMapRef = useRef<Map<string, File>>(new Map());

  // Step 2 State: Pre-Agregador Dashboard (DB Addons with isActive: false)
  const [dbPreAddons, setDbPreAddons] = useState<any[]>([]);
  const [loadingPreAddons, setLoadingPreAddons] = useState(false);
  const [publishingIds, setPublishingIds] = useState<string[]>([]);
  const [updatingBatchId, setUpdatingBatchId] = useState<string | null>(null);

  // Batch Editor Inputs for Step 2
  const [batchCategory, setBatchCategory] = useState("Chocolates & Dulces");
  const [batchPrice, setBatchPrice] = useState<number>(15);
  const [batchType, setBatchType] = useState<"checkbox" | "text" | "select">("checkbox");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPreAddonsData();
  }, []);

  async function fetchPreAddonsData() {
    setLoadingPreAddons(true);
    try {
      const res = await fetch("/api/admin/addons");
      if (res.ok) {
        const data = await res.json();
        const allAddons = data.addons || [];
        const preOnly = allAddons.filter((a: any) => a.isActive === false);
        setDbPreAddons(preOnly);
      }
    } catch (error) {
      console.error("Error al cargar adicionales pre-agregados:", error);
    } finally {
      setLoadingPreAddons(false);
    }
  }

  // Extracción de nombre limpio desde el nombre de archivo
  const cleanFilenameToName = (filename: string): string => {
    let clean = filename.replace(/\.[^/.]+$/, "");
    clean = clean.replace(/[-_]/g, " ");
    clean = clean.replace(/\b\w/g, (char) => char.toUpperCase());
    return clean.trim() || "Adicional Exclusivo";
  };

  // Manejador de selección múltiple de archivos con subida concurrente y tokens individuales
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);

    const initialQueueItems: UploadQueueItem[] = fileList.map((file) => {
      const queueId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      filesMapRef.current.set(queueId, file);
      return {
        id: queueId,
        fileName: file.name,
        progress: 0,
        status: "pending",
      };
    });

    setUploadQueue((prev) => [...initialQueueItems, ...prev]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const itemsToProcess = initialQueueItems.map((item) => ({
      queueId: item.id,
      file: filesMapRef.current.get(item.id)!,
    }));

    await processUploadQueue(itemsToProcess);
  };

  const processUploadQueue = async (items: { file: File; queueId: string }[]) => {
    setUploading(true);
    const CONCURRENCY = 3;
    let index = 0;

    const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (index < items.length) {
        const currentIndex = index++;
        const item = items[currentIndex];
        if (item && item.file) {
          await uploadSingleFile(item.file, item.queueId);
        }
      }
    });

    await Promise.all(workers);
    setUploadQueue((prev) => {
      const stillActive = prev.some((q) => q.status === "uploading" || q.status === "pending");
      if (!stillActive) {
        setUploading(false);
      }
      return prev;
    });
  };

  const uploadSingleFile = (file: File, queueId: string): Promise<void> => {
    return new Promise((resolve) => {
      setUploadQueue((prev) =>
        prev.map((q) => (q.id === queueId ? { ...q, status: "uploading", progress: 0, errorMessage: undefined } : q))
      );

      // 1. Obtener autenticación fresca de ImageKit
      fetch("/api/imagekit-auth")
        .then(async (authRes) => {
          if (!authRes.ok) {
            throw new Error(`Error auth (${authRes.status})`);
          }
          return authRes.json();
        })
        .then((authData) => {
          if (!authData.signature || !authData.token || !authData.expire) {
            throw new Error("Credenciales de ImageKit incompletas");
          }

          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append("file", file);
          formData.append("fileName", file.name);
          formData.append("publicKey", publicKey);
          formData.append("signature", authData.signature);
          formData.append("expire", String(authData.expire));
          formData.append("token", authData.token);
          formData.append("folder", "/addons");

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              setUploadQueue((prev) =>
                prev.map((q) => (q.id === queueId ? { ...q, progress: percent } : q))
              );
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                const imageUrl = response.url;

                setUploadQueue((prev) =>
                  prev.map((q) =>
                    q.id === queueId ? { ...q, progress: 100, status: "completed", errorMessage: undefined } : q
                  )
                );

                // Generar inmediatamente la tarjeta de adicional en pantalla
                const extractedName = cleanFilenameToName(file.name);
                const newItem: UploadDraftItem = {
                  id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  name: extractedName,
                  price: 15,
                  category: "Chocolates & Dulces",
                  isCustomCategory: false,
                  description: "Hermoso detalle adicional para complementar tu arreglo floral.",
                  image: imageUrl,
                  type: "checkbox",
                  optionsInput: "",
                };

                setDraftItems((prev) => [...prev, newItem]);
                resolve();
              } catch (err) {
                console.error("Error procesando respuesta ImageKit:", err);
                setUploadQueue((prev) =>
                  prev.map((q) => (q.id === queueId ? { ...q, status: "error", errorMessage: "Error procesando respuesta" } : q))
                );
                resolve();
              }
            } else {
              let errorDetail = `Error ${xhr.status}`;
              try {
                const errObj = JSON.parse(xhr.responseText);
                if (errObj.message) errorDetail = errObj.message;
              } catch (_) {}
              console.error("Error subida ImageKit:", xhr.status, xhr.responseText);
              setUploadQueue((prev) =>
                prev.map((q) => (q.id === queueId ? { ...q, status: "error", errorMessage: errorDetail } : q))
              );
              resolve();
            }
          };

          xhr.onerror = () => {
            setUploadQueue((prev) =>
              prev.map((q) => (q.id === queueId ? { ...q, status: "error", errorMessage: "Error de conexión de red" } : q))
            );
            resolve();
          };

          xhr.ontimeout = () => {
            setUploadQueue((prev) =>
              prev.map((q) => (q.id === queueId ? { ...q, status: "error", errorMessage: "Tiempo de espera agotado" } : q))
            );
            resolve();
          };

          xhr.open("POST", "https://upload.imagekit.io/api/v1/files/upload");
          xhr.send(formData);
        })
        .catch((err) => {
          console.error("Error obteniendo auth para archivo:", err);
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === queueId ? { ...q, status: "error", errorMessage: err?.message || "Error al autenticar" } : q))
          );
          resolve();
        });
    });
  };

  const handleRetryItem = async (queueId: string) => {
    const file = filesMapRef.current.get(queueId);
    if (!file) {
      alert("No se encontró el archivo original en memoria para reintentar.");
      return;
    }
    setUploading(true);
    await uploadSingleFile(file, queueId);
    setUploadQueue((prev) => {
      const stillActive = prev.some((q) => q.status === "uploading" || q.status === "pending");
      if (!stillActive) {
        setUploading(false);
      }
      return prev;
    });
  };

  const handleRetryAllFailed = async () => {
    const failedItems = uploadQueue.filter((q) => q.status === "error");
    const itemsToRetry: { file: File; queueId: string }[] = [];
    failedItems.forEach((q) => {
      const file = filesMapRef.current.get(q.id);
      if (file) {
        itemsToRetry.push({ file, queueId: q.id });
      }
    });
    if (itemsToRetry.length > 0) {
      await processUploadQueue(itemsToRetry);
    }
  };

  const handleAddManualUrl = () => {
    if (!manualUrl.trim()) return;
    const newItem: UploadDraftItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: "Adicional Importado por URL",
      price: 15,
      category: "Chocolates & Dulces",
      isCustomCategory: false,
      description: "Hermoso detalle adicional para complementar tu arreglo floral.",
      image: manualUrl.trim(),
      type: "checkbox",
      optionsInput: "",
    };
    setDraftItems((prev) => [...prev, newItem]);
    setManualUrl("");
    setShowManualUrlModal(false);
  };

  const handleAddBlankCard = () => {
    const newItem: UploadDraftItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: "Nuevo Adicional",
      price: 15,
      category: "Chocolates & Dulces",
      isCustomCategory: false,
      description: "Hermoso detalle adicional para complementar tu arreglo floral.",
      image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800",
      type: "checkbox",
      optionsInput: "",
    };
    setDraftItems((prev) => [...prev, newItem]);
  };

  const handleUpdateDraftItem = (id: string, field: keyof UploadDraftItem, value: any) => {
    setDraftItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Enviar borradores al estado Pre-Agregado (isActive: false)
  const handleSaveToPreAggregator = async () => {
    if (draftItems.length === 0) return;

    setIsSavingPreAgregated(true);
    try {
      const payload = draftItems.map((it) => {
        const parsedOptions = it.type === "select"
          ? it.optionsInput.split(",").map(s => s.trim()).filter(Boolean)
          : [];

        return {
          name: it.name,
          price: it.price,
          category: it.category,
          description: it.description,
          image: it.image,
          type: it.type,
          options: parsedOptions,
        };
      });

      const res = await createBulkAddons(payload, false); // publishImmediately = false
      if (res.success) {
        setDraftItems([]);
        setUploadQueue([]);
        await fetchPreAddonsData();
        setActiveTab("step2");
        alert(`¡Éxito! Se enviaron ${res.count} adicionales al Pre-Agregador. Ahora puedes visualizarlos y publicarlos.`);
      } else {
        alert(`Error al enviar a Pre-Agregador: ${res.error}`);
      }
    } catch (error) {
      console.error("Error al enviar a pre-agregador:", error);
      alert("Error al procesar la pre-agregación.");
    } finally {
      setIsSavingPreAgregated(false);
    }
  };

  // Agrupar adicionales de DB Pre-Agregador por Fecha de Subida (Batch)
  const groupPreAddonsByDate = () => {
    const groups: { [key: string]: any[] } = {};

    dbPreAddons.forEach((addon) => {
      const dateObj = addon.createdAt ? new Date(addon.createdAt) : new Date();
      const dateKey = dateObj.toLocaleString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(addon);
    });

    return Object.entries(groups).map(([dateLabel, addons]) => ({
      dateLabel,
      addons,
    }));
  };

  const batchGroups = groupPreAddonsByDate();

  // Aplicar edición en lote a un grupo específico de adicionales
  const handleApplyBatchEditToGroup = async (groupAddons: any[], groupKey: string) => {
    const ids = groupAddons.map((a) => a._id);
    setUpdatingBatchId(groupKey);
    try {
      const res = await updateBulkAddonBatch(ids, {
        category: batchCategory,
        price: batchPrice,
        type: batchType,
      });

      if (res.success) {
        await fetchPreAddonsData();
        alert(`¡Lote actualizado! Se aplicaron los atributos a ${res.count} adicionales.`);
      } else {
        alert(`Error al actualizar lote: ${res.error}`);
      }
    } catch (error) {
      console.error("Error al actualizar lote:", error);
    } finally {
      setUpdatingBatchId(null);
    }
  };

  // Publicar lote completo (isActive: true)
  const handlePublishGroup = async (groupAddons: any[]) => {
    const ids = groupAddons.map((a) => a._id);
    if (!confirm(`¿Publicar ${ids.length} adicionales en la tienda pública?`)) return;

    setPublishingIds(ids);
    try {
      const res = await publishBulkAddonBatch(ids);
      if (res.success) {
        await fetchPreAddonsData();
        alert(`🚀 ¡Enhorabuena! Se publicaron ${res.count} adicionales en la tienda.`);
      } else {
        alert(`Error al publicar lote: ${res.error}`);
      }
    } catch (error) {
      console.error("Error al publicar lote:", error);
    } finally {
      setPublishingIds([]);
    }
  };

  const handleDeletePreAddon = async (id: string, name: string) => {
    if (confirm(`¿Eliminar borrador "${name}"?`)) {
      await deleteAddon(id);
      setDbPreAddons((prev) => prev.filter((a) => a._id !== id));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <Link
            href="/admin/adicionales"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 font-bold mb-2 transition-colors"
          >
            <ArrowLeft size={14} /> Volver a Adicionales
          </Link>
          <h1 className="text-2xl font-black text-[#1A1C1C] flex items-center gap-2">
            <Layers className="text-purple-600" size={24} />
            Módulo de Carga en Masa y Pre-Agregador de Adicionales
          </h1>
          <p className="text-xs text-gray-400">
            Sube múltiples fotos asíncronamente con seguimiento de progreso por imagen y edita sus atributos por tarjeta.
          </p>
        </div>

        {/* Selector de Pasos / Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("step1")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "step1"
                ? "bg-purple-600 text-white shadow-md"
                : "text-gray-600 hover:bg-white"
            }`}
          >
            <Upload size={14} />
            <span>1. Subir Fotos</span>
            {draftItems.length > 0 && (
              <span className="bg-purple-200 text-purple-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {draftItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              fetchPreAddonsData();
              setActiveTab("step2");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "step2"
                ? "bg-purple-600 text-white shadow-md"
                : "text-gray-600 hover:bg-white"
            }`}
          >
            <Package size={14} />
            <span>2. Pre-Agregador</span>
            {dbPreAddons.length > 0 && (
              <span className="bg-[#D4AF37] text-gray-900 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {dbPreAddons.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PASO 1: SUBIDA MASIVA ASÍNCRONA CON BARRA DE CARGA INDIVIDUAL */}
      {/* ========================================================================= */}
      {activeTab === "step1" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Subidor Múltiple con Input File Nativo */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFilesSelected}
            style={{ display: "none" }}
          />

          <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50/20 hover:bg-purple-50/40 transition-all text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-white rounded-2xl mx-auto flex items-center justify-center text-purple-600 shadow-md border border-purple-100">
              {uploading ? <Loader2 className="animate-spin" size={28} /> : <Upload size={28} />}
            </div>

            <div>
              <h3 className="font-black text-lg text-gray-900">
                {uploading ? "Subiendo imágenes asíncronamente a ImageKit..." : "Selecciona Múltiples Imágenes de Adicionales"}
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-lg mx-auto">
                Selecciona decenas de fotos a la vez (bombones, peluches, globos, tarjetas). Cada imagen mostrará su barra de carga individual y generará su tarjeta editable.
              </p>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Upload size={14} />
                <span>{uploading ? "Cargando Fotos..." : "Seleccionar Fotos Múltiples"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowManualUrlModal(true)}
                className="bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                <LinkIcon size={14} />
                <span>Añadir por URL</span>
              </button>

              <button
                type="button"
                onClick={handleAddBlankCard}
                className="bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Agregar Fila Vacía</span>
              </button>
            </div>
          </div>

          {/* Sección de Cola con Barras de Carga Individuales por Archivo */}
          {uploadQueue.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex flex-wrap justify-between items-center border-b pb-2 gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                  <Clock size={14} className="text-purple-600" />
                  Cola de Subida a ImageKit ({uploadQueue.filter(q => q.status === "completed").length} / {uploadQueue.length} completados)
                </h4>
                <div className="flex items-center gap-3">
                  {uploadQueue.some(q => q.status === "error") && (
                    <button
                      type="button"
                      onClick={handleRetryAllFailed}
                      disabled={uploading}
                      className="text-[11px] text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={uploading ? "animate-spin" : ""} />
                      Reintentar fallidos
                    </button>
                  )}
                  {uploadQueue.some(q => q.status === "completed") && (
                    <button
                      type="button"
                      onClick={() => setUploadQueue(prev => prev.filter(q => q.status !== "completed"))}
                      className="text-[11px] text-gray-400 hover:text-gray-600 font-bold"
                    >
                      Limpiar lista completada
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {uploadQueue.map((item) => (
                  <div key={item.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-gray-800 truncate max-w-[200px] sm:max-w-xs">
                        {item.fileName}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.status === "pending" && (
                          <span className="font-bold text-gray-400 flex items-center gap-1 text-[11px]">
                            <Clock size={12} /> En cola...
                          </span>
                        )}
                        {item.status === "uploading" && (
                          <span className="font-extrabold text-purple-600 flex items-center gap-1">
                            <Loader2 size={12} className="animate-spin" /> {item.progress}%
                          </span>
                        )}
                        {item.status === "completed" && (
                          <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 size={14} /> ¡100% Completado!
                          </span>
                        )}
                        {item.status === "error" && (
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-red-600 flex items-center gap-1" title={item.errorMessage}>
                              <AlertCircle size={14} /> Error {item.errorMessage ? `(${item.errorMessage})` : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRetryItem(item.id)}
                              disabled={uploading}
                              className="bg-red-50 hover:bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-200 transition-colors flex items-center gap-1"
                              title="Reintentar esta imagen"
                            >
                              <RefreshCw size={10} /> Reintentar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Barra de Progreso Individual */}
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${
                          item.status === "completed"
                            ? "bg-emerald-500"
                            : item.status === "error"
                            ? "bg-red-500"
                            : item.status === "pending"
                            ? "bg-gray-300"
                            : "bg-purple-600"
                        }`}
                        style={{ width: `${item.status === "pending" ? 5 : item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal de URL Manual */}
          {showManualUrlModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="font-bold text-base text-gray-900">Añadir URL de Imagen</h3>
                  <button type="button" onClick={() => setShowManualUrlModal(false)} className="text-gray-400 p-1">
                    <X size={18} />
                  </button>
                </div>
                <div>
                  <input
                    type="url"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    placeholder="https://ik.imagekit.io/4ub2sqhjx/addons/chocolate.jpg"
                    className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={handleAddManualUrl} className="px-4 py-2 text-xs font-bold bg-purple-600 text-white rounded-xl">
                    Añadir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Tarjetas de Adicionales Generadas en Tiempo Real */}
          {draftItems.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                    <Package size={18} className="text-purple-600" />
                    Tarjetas de Adicionales Generadas ({draftItems.length})
                  </h3>
                  <p className="text-xs text-gray-400">Edita los datos de cada adicional antes de enviarlos al Pre-Agregador.</p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("¿Vaciar todas las tarjetas de la lista?")) setDraftItems([]);
                    }}
                    className="text-xs text-red-600 font-bold hover:underline px-2"
                  >
                    Vaciar Lista
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToPreAggregator}
                    disabled={isSavingPreAgregated}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-full text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 w-full sm:w-auto"
                  >
                    {isSavingPreAgregated ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                    <span>Enviar a Pre-Agregador (Paso 2)</span>
                  </button>
                </div>
              </div>

              {/* Grid de Tarjetas de Adicionales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {draftItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-purple-300 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    {/* Header de la Tarjeta */}
                    <div className="bg-gradient-to-r from-gray-900 to-[#12131A] text-white px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-purple-300">
                        Adicional #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDraftItems(prev => prev.filter(it => it.id !== item.id))}
                        className="text-gray-400 hover:text-red-400 p-1 rounded-lg hover:bg-white/10 transition-colors"
                        title="Eliminar tarjeta"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="p-4 space-y-4 flex-1">
                      {/* Bloque Principal: Imagen & Nombre */}
                      <div className="flex gap-4">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 relative">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                            ImageKit
                          </span>
                        </div>

                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                              Nombre del Adicional *
                            </label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateDraftItem(item.id, "name", e.target.value)}
                              placeholder="Ej: Ferrero Rocher 16ct..."
                              className="w-full p-2 border rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                          </div>

                          {/* Bloque de Precio */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                              <DollarSign size={10} className="text-purple-600" /> Precio ($ USD) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => handleUpdateDraftItem(item.id, "price", parseFloat(e.target.value) || 0)}
                              className="w-full p-2 border rounded-xl text-xs font-black text-purple-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bloque de Categoría */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Categoría del Adicional
                        </label>

                        {item.isCustomCategory ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={item.category}
                              onChange={(e) => handleUpdateDraftItem(item.id, "category", e.target.value)}
                              placeholder="Escribe la categoría nueva..."
                              className="w-full p-2 border border-purple-400 bg-purple-50/40 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateDraftItem(item.id, "isCustomCategory", false);
                                handleUpdateDraftItem(item.id, "category", "Chocolates & Dulces");
                              }}
                              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 transition-colors flex-shrink-0"
                              title="Volver a lista de categorías"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <select
                            value={item.category}
                            onChange={(e) => {
                              if (e.target.value === "__NEW_CATEGORY__") {
                                handleUpdateDraftItem(item.id, "isCustomCategory", true);
                                handleUpdateDraftItem(item.id, "category", "");
                              } else {
                                handleUpdateDraftItem(item.id, "category", e.target.value);
                              }
                            }}
                            className="w-full p-2 border rounded-xl text-xs font-semibold bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                            <option value="__NEW_CATEGORY__">➕ Crear Categoría Nueva...</option>
                          </select>
                        )}
                      </div>

                      {/* Bloque de Tipo de Comportamiento */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Tipo de Comportamiento / Input
                        </label>
                        <select
                          value={item.type}
                          onChange={(e) => handleUpdateDraftItem(item.id, "type", e.target.value)}
                          className="w-full p-2 border rounded-xl text-xs font-semibold bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                          {ADDON_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Si es tipo 'select', mostrar input de opciones */}
                      {item.type === "select" && (
                        <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 space-y-1">
                          <label className="block text-[10px] font-bold text-purple-900 uppercase tracking-wider">
                            Opciones Disponibles (separadas por comas)
                          </label>
                          <input
                            type="text"
                            value={item.optionsInput}
                            onChange={(e) => handleUpdateDraftItem(item.id, "optionsInput", e.target.value)}
                            placeholder="Ej: Rojas, Rosadas, Blancas, Mixtas"
                            className="w-full p-2 border rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                      )}

                      {/* Bloque de Descripción */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                          Descripción (Opcional)
                        </label>
                        <textarea
                          rows={2}
                          value={item.description}
                          onChange={(e) => handleUpdateDraftItem(item.id, "description", e.target.value)}
                          className="w-full p-2 border rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* PASO 2: PRE-AGREGADOR (STAGING DASHBOARD AGRUPADO POR FECHA DE SUBIDA) */}
      {/* ========================================================================= */}
      {activeTab === "step2" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Header informativo del Pre-Agregador */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Clock className="text-purple-600" size={20} />
                Panel Pre-Agregador: Adicionales Pausados Agrupados por Fecha
              </h2>
              <button
                type="button"
                onClick={fetchPreAddonsData}
                className="text-xs text-purple-600 font-bold hover:underline flex items-center gap-1"
              >
                Actualizar Lista
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Aquí se encuentran todos los borradores listos para ser editados en masa por lote (categorías, precios, tipos) y publicados cuando decidas.
            </p>
          </div>

          {loadingPreAddons ? (
            <div className="p-16 text-center text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="animate-spin text-purple-600" size={24} />
              <span>Cargando adicionales en Pre-Agregador...</span>
            </div>
          ) : batchGroups.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100 shadow-sm space-y-3">
              <Package size={44} className="mx-auto text-gray-300" />
              <p className="font-bold text-gray-700 text-base">No hay adicionales pendientes en el Pre-Agregador.</p>
              <p className="text-xs text-gray-400">
                Sube fotos en el Paso 1 para comenzar a editar en lote por fecha.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("step1")}
                className="bg-purple-600 text-white px-5 py-2.5 rounded-full text-xs font-bold hover:bg-purple-700 transition-colors inline-flex items-center gap-1.5 shadow-md"
              >
                <Plus size={14} /> Ir al Paso 1: Subir Fotos
              </button>
            </div>
          ) : (
            batchGroups.map((group, groupIdx) => {
              const isGroupUpdating = updatingBatchId === group.dateLabel;
              const isGroupPublishing = publishingIds.some((id) =>
                group.addons.some((a) => a._id === id)
              );

              return (
                <div
                  key={group.dateLabel}
                  className="bg-white rounded-2xl border-2 border-gray-200/80 shadow-md overflow-hidden space-y-4"
                >
                  {/* Encabezado del Grupo / Lote por Fecha */}
                  <div className="bg-gradient-to-r from-gray-900 via-[#1A1C1C] to-gray-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-600 rounded-xl text-white font-black text-xs">
                        #{groupIdx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-[#D4AF37]" />
                          <h3 className="font-bold text-sm text-white">
                            Lote del {group.dateLabel}
                          </h3>
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {group.addons.length} adicionales registrados en este lote
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePublishGroup(group.addons)}
                      disabled={isGroupPublishing}
                      className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isGroupPublishing ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Rocket size={16} />
                      )}
                      <span>🚀 Publicar Lote Completo a Tienda ({group.addons.length})</span>
                    </button>
                  </div>

                  {/* Barra de Edición Masiva para este Lote */}
                  <div className="p-5 bg-purple-50/30 dark:bg-gray-800/30 border-b border-gray-200/80 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <div className="flex items-center gap-2 text-xs font-black text-purple-700 uppercase tracking-wider">
                        <Wand2 size={16} />
                        Edición en Lote para este Grupo ({group.addons.length} adicionales)
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplyBatchEditToGroup(group.addons, group.dateLabel)}
                        disabled={isGroupUpdating}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isGroupUpdating ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        <span>Aplicar Cambios a este Lote</span>
                      </button>
                    </div>

                    {/* Campos de Atributos Comunes */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {/* Categoría */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Categoría
                        </label>
                        <select
                          value={batchCategory}
                          onChange={(e) => setBatchCategory(e.target.value)}
                          className="w-full p-2 border rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Precio */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Precio ($ USD)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={batchPrice}
                          onChange={(e) => setBatchPrice(parseFloat(e.target.value) || 0)}
                          className="w-full p-2 border rounded-xl text-xs font-black text-purple-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                      </div>

                      {/* Tipo */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Tipo de Comportamiento
                        </label>
                        <select
                          value={batchType}
                          onChange={(e) => setBatchType(e.target.value as any)}
                          className="w-full p-2 border rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                          {ADDON_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Grid de Adicionales Individuales del Lote */}
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.addons.map((addon) => (
                      <div
                        key={addon._id}
                        className="bg-white border rounded-2xl p-4 shadow-sm relative space-y-3 hover:shadow-md transition-shadow"
                      >
                        <div className="flex gap-3">
                          <img
                            src={addon.image || "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800"}
                            alt={addon.name}
                            className="w-16 h-16 rounded-xl object-cover border flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-xs text-gray-900 block truncate">
                              {addon.name}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-black text-purple-700">
                                {addon.price > 0 ? `$${addon.price.toFixed(2)}` : "GRATIS"}
                              </span>
                              <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-bold">
                                {addon.category}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium block mt-0.5 capitalize">
                              Tipo: {addon.type || "checkbox"}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t text-xs">
                          <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Pausado / Pre-Agregado ⏸️
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeletePreAddon(addon._id, addon.name)}
                            className="text-gray-400 hover:text-red-600 p-1"
                            title="Eliminar borrador"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })
          )}

        </div>
      )}

    </div>
  );
}
