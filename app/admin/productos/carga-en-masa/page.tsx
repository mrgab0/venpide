"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createBulkProducts,
  updateBulkBatch,
  publishBulkBatch,
  fetchAddonsList,
  deleteProduct
} from "@/lib/actions/product";
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
  CheckSquare,
  Square,
  Flower2,
  Tag,
  Gift,
  DollarSign,
  AlertCircle,
  RefreshCw
} from "lucide-react";

const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "public_YuXO1v+TwY0jYouCF4REzzh/MD0=";

const CATEGORIES = [
  "Rosas de Lujo",
  "Bouquets & Cajas",
  "Heart Boxes",
  "Flores Amarillas",
  "Cumpleaños",
  "Aniversario",
  "Infantiles",
  "Condolencias",
  "General"
];

const BOUQUET_TYPES = [
  "Ramo Royal",
  "Caja Estilo Dior",
  "Heart Box",
  "Arreglo en Jarrón",
  "Bouquet Especial",
  "Caja Cuadrada de Rosas"
];

const FLOWER_COUNT_OPTIONS = [0, 12, 18, 24, 36, 50, 100, 200];
const BADGES = ["", "Bestsellers", "Luxury", "Popular!", "Oferta", "Nuevo"];

interface UploadDraftItem {
  id: string;
  name: string;
  price: number;
  category: string;
  isCustomCategory?: boolean;
  description: string;
  stock: number;
  images: string[];
  badge: string;
  flowerCount: number;
  bouquetType: string;
}

interface UploadQueueItem {
  id: string;
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  errorMessage?: string;
}

export default function CargaEnMasaAdmin() {
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

  // Step 2 State: Pre-Agregador Dashboard (DB Products with isActive: false)
  const [dbPreProducts, setDbPreProducts] = useState<any[]>([]);
  const [loadingPreProducts, setLoadingPreProducts] = useState(false);
  const [availableAddons, setAvailableAddons] = useState<any[]>([]);
  const [publishingIds, setPublishingIds] = useState<string[]>([]);
  const [updatingBatchId, setUpdatingBatchId] = useState<string | null>(null);

  // Batch Editor Inputs for Step 2
  const [batchCategory, setBatchCategory] = useState("Rosas de Lujo");
  const [batchFlowerCount, setBatchFlowerCount] = useState<number>(24);
  const [batchBouquetType, setBatchBouquetType] = useState("Ramo Royal");
  const [batchPrice, setBatchPrice] = useState<number>(85);
  const [batchStock, setBatchStock] = useState<number>(15);
  const [batchBadge, setBatchBadge] = useState("Bestsellers");
  const [batchAddons, setBatchAddons] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPreProductsData();
    loadAddonsData();
  }, []);

  async function fetchPreProductsData() {
    setLoadingPreProducts(true);
    try {
      const res = await fetch("/api/admin/products");
      if (res.ok) {
        const data = await res.json();
        const allProducts = data.products || [];
        const preOnly = allProducts.filter((p: any) => p.isActive === false);
        setDbPreProducts(preOnly);
      }
    } catch (error) {
      console.error("Error al cargar productos pre-agregados:", error);
    } finally {
      setLoadingPreProducts(false);
    }
  }

  async function loadAddonsData() {
    const res = await fetchAddonsList();
    if (res.success && res.addons) {
      setAvailableAddons(res.addons);
    }
  }

  // Extracción de nombre limpio desde el nombre de archivo
  const cleanFilenameToName = (filename: string): string => {
    let clean = filename.replace(/\.[^/.]+$/, "");
    clean = clean.replace(/[-_]/g, " ");
    clean = clean.replace(/\b\w/g, (char) => char.toUpperCase());
    return clean.trim() || "Arreglo Floral Exclusivo";
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

      // 1. Obtener autenticación fresca y única para este archivo específico
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
          formData.append("folder", "/products");

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

                // Generar inmediatamente la tarjeta de producto en pantalla
                const extractedName = cleanFilenameToName(file.name);
                const newItem: UploadDraftItem = {
                  id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  name: extractedName,
                  price: 50,
                  category: "Rosas de Lujo",
                  isCustomCategory: false,
                  description: "Hermoso arreglo elaborado con flores frescas de la más alta calidad en Bonbon Flowers.",
                  stock: 10,
                  images: [imageUrl],
                  badge: "",
                  flowerCount: 0,
                  bouquetType: "",
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
      name: "Producto Importado por URL",
      price: 50,
      category: "Rosas de Lujo",
      isCustomCategory: false,
      description: "Hermoso arreglo elaborado con flores frescas de la más alta calidad en Bonbon Flowers.",
      stock: 10,
      images: [manualUrl.trim()],
      badge: "",
      flowerCount: 0,
      bouquetType: "",
    };
    setDraftItems((prev) => [...prev, newItem]);
    setManualUrl("");
    setShowManualUrlModal(false);
  };

  const handleAddBlankCard = () => {
    const newItem: UploadDraftItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: "Nuevo Arreglo Floral",
      price: 50,
      category: "Rosas de Lujo",
      isCustomCategory: false,
      description: "Hermoso arreglo elaborado con flores frescas de la más alta calidad en Bonbon Flowers.",
      stock: 10,
      images: ["https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=800"],
      badge: "",
      flowerCount: 0,
      bouquetType: "",
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
      const payload = draftItems.map((it) => ({
        name: it.name,
        price: it.price,
        category: it.category,
        description: it.description,
        images: it.images,
        stock: it.stock,
        badge: it.badge,
        flowerCount: it.flowerCount,
        bouquetType: it.bouquetType,
      }));

      const res = await createBulkProducts(payload, false); // publishImmediately = false
      if (res.success) {
        setDraftItems([]);
        setUploadQueue([]);
        await fetchPreProductsData();
        setActiveTab("step2");
        alert(`¡Éxito! Se enviaron ${res.count} productos al Pre-Agregador. Ahora puedes visualizarlos y publicarlos.`);
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

  // Agrupar productos de DB Pre-Agregador por Fecha de Subida (Batch)
  const groupPreProductsByDate = () => {
    const groups: { [key: string]: any[] } = {};

    dbPreProducts.forEach((prod) => {
      const dateObj = prod.createdAt ? new Date(prod.createdAt) : new Date();
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
      groups[dateKey].push(prod);
    });

    return Object.entries(groups).map(([dateLabel, products]) => ({
      dateLabel,
      products,
    }));
  };

  const batchGroups = groupPreProductsByDate();

  // Aplicar edición en lote a un grupo específico de productos
  const handleApplyBatchEditToGroup = async (groupProducts: any[], groupKey: string) => {
    const ids = groupProducts.map((p) => p._id);
    setUpdatingBatchId(groupKey);
    try {
      const res = await updateBulkBatch(ids, {
        category: batchCategory,
        flowerCount: batchFlowerCount,
        bouquetType: batchBouquetType,
        price: batchPrice,
        stock: batchStock,
        badge: batchBadge,
        addons: batchAddons,
      });

      if (res.success) {
        await fetchPreProductsData();
        alert(`¡Lote actualizado! Se aplicaron los atributos a ${res.count} productos.`);
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
  const handlePublishGroup = async (groupProducts: any[]) => {
    const ids = groupProducts.map((p) => p._id);
    if (!confirm(`¿Publicar ${ids.length} productos en la tienda pública?`)) return;

    setPublishingIds(ids);
    try {
      const res = await publishBulkBatch(ids);
      if (res.success) {
        await fetchPreProductsData();
        alert(`🚀 ¡Enhorabuena! Se publicaron ${res.count} productos en la tienda.`);
      } else {
        alert(`Error al publicar lote: ${res.error}`);
      }
    } catch (error) {
      console.error("Error al publicar lote:", error);
    } finally {
      setPublishingIds([]);
    }
  };

  const handleDeletePreProduct = async (id: string, name: string) => {
    if (confirm(`¿Eliminar borrador "${name}"?`)) {
      await deleteProduct(id);
      setDbPreProducts((prev) => prev.filter((p) => p._id !== id));
    }
  };

  const toggleAddonSelection = (addonId: string) => {
    setBatchAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <Link
            href="/admin/productos"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#8B0024] font-bold mb-2 transition-colors"
          >
            <ArrowLeft size={14} /> Volver al Inventario
          </Link>
          <h1 className="text-2xl font-black text-[#1A1C1C] flex items-center gap-2">
            <Layers className="text-[#8B0024]" size={24} />
            Módulo de Carga en Masa y Pre-Agregador
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
                ? "bg-[#8B0024] text-white shadow-md"
                : "text-gray-600 hover:bg-white"
            }`}
          >
            <Upload size={14} />
            <span>1. Subir Fotos</span>
            {draftItems.length > 0 && (
              <span className="bg-pink-300 text-gray-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {draftItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              fetchPreProductsData();
              setActiveTab("step2");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "step2"
                ? "bg-[#8B0024] text-white shadow-md"
                : "text-gray-600 hover:bg-white"
            }`}
          >
            <Package size={14} />
            <span>2. Pre-Agregador</span>
            {dbPreProducts.length > 0 && (
              <span className="bg-[#D4AF37] text-gray-900 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {dbPreProducts.length}
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

          <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-[#8B0024]/40 bg-[#8B0024]/5 hover:bg-[#8B0024]/10 transition-all text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-white rounded-2xl mx-auto flex items-center justify-center text-[#8B0024] shadow-md border border-pink-100">
              {uploading ? <Loader2 className="animate-spin" size={28} /> : <Upload size={28} />}
            </div>

            <div>
              <h3 className="font-black text-lg text-gray-900">
                {uploading ? "Subiendo imágenes asíncronamente a ImageKit..." : "Selecciona Múltiples Imágenes de Productos"}
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-lg mx-auto">
                Selecciona decenas de fotos a la vez. Cada imagen mostrará su propia barra de progreso de carga en tiempo real y generará su tarjeta de producto en pantalla.
              </p>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-[#8B0024] hover:bg-[#70001d] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
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
                  <Clock size={14} className="text-[#8B0024]" />
                  Cola de Subida a ImageKit ({uploadQueue.filter(q => q.status === "completed").length} / {uploadQueue.length} completados)
                </h4>
                <div className="flex items-center gap-3">
                  {uploadQueue.some(q => q.status === "error") && (
                    <button
                      type="button"
                      onClick={handleRetryAllFailed}
                      disabled={uploading}
                      className="text-[11px] text-[#8B0024] hover:text-[#70001d] font-bold flex items-center gap-1 disabled:opacity-50"
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
                          <span className="font-extrabold text-[#8B0024] flex items-center gap-1">
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
                            : "bg-[#8B0024]"
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
                    placeholder="https://ik.imagekit.io/4ub2sqhjx/products/rosas.jpg"
                    className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B0024]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={handleAddManualUrl} className="px-4 py-2 text-xs font-bold bg-[#8B0024] text-white rounded-xl">
                    Añadir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Tarjetas de Productos Generadas en Tiempo Real */}
          {draftItems.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                    <Package size={18} className="text-[#8B0024]" />
                    Tarjetas de Productos Generadas ({draftItems.length})
                  </h3>
                  <p className="text-xs text-gray-400">Edita los bloques de cada producto antes de enviarlos al Pre-Agregador.</p>
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
                    className="bg-[#8B0024] hover:bg-[#70001d] text-white px-5 py-2.5 rounded-full text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 w-full sm:w-auto"
                  >
                    {isSavingPreAgregated ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                    <span>Enviar a Pre-Agregador (Paso 2)</span>
                  </button>
                </div>
              </div>

              {/* Grid de Tarjetas de Productos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {draftItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-[#8B0024]/40 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    {/* Header de la Tarjeta */}
                    <div className="bg-gradient-to-r from-gray-900 to-[#12131A] text-white px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-pink-300">
                        Producto #{idx + 1}
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
                          <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                            ImageKit
                          </span>
                        </div>

                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                              Nombre del Producto *
                            </label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateDraftItem(item.id, "name", e.target.value)}
                              placeholder="Nombre del arreglo..."
                              className="w-full p-2 border rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B0024]"
                            />
                          </div>

                          {/* Bloques de Precio y Stock */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                <DollarSign size={10} className="text-[#8B0024]" /> Precio ($)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => handleUpdateDraftItem(item.id, "price", parseFloat(e.target.value) || 0)}
                                className="w-full p-2 border rounded-xl text-xs font-black text-[#8B0024] bg-white focus:outline-none focus:ring-2 focus:ring-[#8B0024]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                Stock
                              </label>
                              <input
                                type="number"
                                value={item.stock}
                                onChange={(e) => handleUpdateDraftItem(item.id, "stock", parseInt(e.target.value) || 0)}
                                className="w-full p-2 border rounded-xl text-xs font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#8B0024]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bloque de Categoría (Selector + Categoría Nueva) */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Categoría del Producto
                        </label>

                        {item.isCustomCategory ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={item.category}
                              onChange={(e) => handleUpdateDraftItem(item.id, "category", e.target.value)}
                              placeholder="Escribe la categoría nueva..."
                              className="w-full p-2 border border-pink-400 bg-pink-50/40 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B0024]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateDraftItem(item.id, "isCustomCategory", false);
                                handleUpdateDraftItem(item.id, "category", "Rosas de Lujo");
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
                            className="w-full p-2 border rounded-xl text-xs font-semibold bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#8B0024]"
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

                      {/* Bloques de Atributos: Rosas, Tipo Bouquet e Insignia */}
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                            <Flower2 size={10} className="text-pink-600" /> Rosas
                          </label>
                          <select
                            value={item.flowerCount}
                            onChange={(e) => handleUpdateDraftItem(item.id, "flowerCount", parseInt(e.target.value) || 0)}
                            className="w-full p-1.5 border rounded-xl text-xs font-bold bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#8B0024]"
                          >
                            {FLOWER_COUNT_OPTIONS.map((fc) => (
                              <option key={fc} value={fc}>
                                {fc === 0 ? "General" : `${fc} u.`}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                            Estilo
                          </label>
                          <select
                            value={item.bouquetType}
                            onChange={(e) => handleUpdateDraftItem(item.id, "bouquetType", e.target.value)}
                            className="w-full p-1.5 border rounded-xl text-xs font-semibold bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#8B0024]"
                          >
                            <option value="">Sin definir</option>
                            {BOUQUET_TYPES.map((bt) => (
                              <option key={bt} value={bt}>
                                {bt}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                            <Tag size={10} className="text-[#8B0024]" /> Badge
                          </label>
                          <select
                            value={item.badge}
                            onChange={(e) => handleUpdateDraftItem(item.id, "badge", e.target.value)}
                            className="w-full p-1.5 border rounded-xl text-xs font-semibold bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#8B0024]"
                          >
                            <option value="">Ninguno</option>
                            {BADGES.filter(Boolean).map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Bloque de Descripción */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                          Descripción
                        </label>
                        <textarea
                          rows={2}
                          value={item.description}
                          onChange={(e) => handleUpdateDraftItem(item.id, "description", e.target.value)}
                          className="w-full p-2 border rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8B0024]"
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
                <Clock className="text-[#8B0024]" size={20} />
                Panel Pre-Agregador: Productos Pausados Agrupados por Fecha
              </h2>
              <button
                type="button"
                onClick={fetchPreProductsData}
                className="text-xs text-[#8B0024] font-bold hover:underline flex items-center gap-1"
              >
                Actualizar Lista
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Aquí se encuentran todos los borradores listos para ser editados en masa por grupo (rosas, precios, adicionales) y publicados cuando decidas.
            </p>
          </div>

          {loadingPreProducts ? (
            <div className="p-16 text-center text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="animate-spin text-[#8B0024]" size={24} />
              <span>Cargando productos en Pre-Agregador...</span>
            </div>
          ) : batchGroups.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100 shadow-sm space-y-3">
              <Package size={44} className="mx-auto text-gray-300" />
              <p className="font-bold text-gray-700 text-base">No hay productos pendientes en el Pre-Agregador.</p>
              <p className="text-xs text-gray-400">
                Sube fotos en el Paso 1 para comenzar a editar en lote por fecha.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("step1")}
                className="bg-[#8B0024] text-white px-5 py-2.5 rounded-full text-xs font-bold hover:bg-[#70001d] transition-colors inline-flex items-center gap-1.5 shadow-md"
              >
                <Plus size={14} /> Ir al Paso 1: Subir Fotos
              </button>
            </div>
          ) : (
            batchGroups.map((group, groupIdx) => {
              const isGroupUpdating = updatingBatchId === group.dateLabel;
              const isGroupPublishing = publishingIds.some((id) =>
                group.products.some((p) => p._id === id)
              );

              return (
                <div
                  key={group.dateLabel}
                  className="bg-white rounded-2xl border-2 border-gray-200/80 shadow-md overflow-hidden space-y-4"
                >
                  {/* Encabezado del Grupo / Lote por Fecha */}
                  <div className="bg-gradient-to-r from-gray-900 via-[#1A1C1C] to-gray-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#8B0024] rounded-xl text-white font-black text-xs">
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
                          {group.products.length} productos registrados en este lote
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePublishGroup(group.products)}
                      disabled={isGroupPublishing}
                      className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isGroupPublishing ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Rocket size={16} />
                      )}
                      <span>🚀 Publicar Lote Completo a Tienda ({group.products.length})</span>
                    </button>
                  </div>

                  {/* Barra de Edición Masiva Avanzada para este Lote */}
                  <div className="p-5 bg-pink-50/40 dark:bg-gray-800/30 border-b border-gray-200/80 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <div className="flex items-center gap-2 text-xs font-black text-[#8B0024] uppercase tracking-wider">
                        <Wand2 size={16} />
                        Edición en Lote para este Grupo ({group.products.length} ítems)
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplyBatchEditToGroup(group.products, group.dateLabel)}
                        disabled={isGroupUpdating}
                        className="bg-[#8B0024] hover:bg-[#70001d] text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                      {/* Categoría */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Categoría
                        </label>
                        <select
                          value={batchCategory}
                          onChange={(e) => setBatchCategory(e.target.value)}
                          className="w-full p-2 border rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#8B0024]"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Cantidad de Rosas */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Flower2 size={10} className="text-pink-600" /> Cant. Rosas
                        </label>
                        <select
                          value={batchFlowerCount}
                          onChange={(e) => setBatchFlowerCount(parseInt(e.target.value) || 0)}
                          className="w-full p-2 border rounded-xl text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#8B0024]"
                        >
                          {FLOWER_COUNT_OPTIONS.map((count) => (
                            <option key={count} value={count}>
                              {count === 0 ? "Sin definir" : `${count} Rosas`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Tipo de Bouquet */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Tipo Bouquet
                        </label>
                        <select
                          value={batchBouquetType}
                          onChange={(e) => setBatchBouquetType(e.target.value)}
                          className="w-full p-2 border rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#8B0024]"
                        >
                          {BOUQUET_TYPES.map((bt) => (
                            <option key={bt} value={bt}>
                              {bt}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Precio */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Precio ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={batchPrice}
                          onChange={(e) => setBatchPrice(parseFloat(e.target.value) || 0)}
                          className="w-full p-2 border rounded-xl text-xs font-black text-[#8B0024] bg-white focus:outline-none focus:ring-2 focus:ring-[#8B0024]"
                        />
                      </div>

                      {/* Stock */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Stock
                        </label>
                        <input
                          type="number"
                          value={batchStock}
                          onChange={(e) => setBatchStock(parseInt(e.target.value) || 0)}
                          className="w-full p-2 border rounded-xl text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#8B0024]"
                        />
                      </div>

                      {/* Badge / Insignia */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Tag size={10} className="text-[#8B0024]" /> Insignia
                        </label>
                        <select
                          value={batchBadge}
                          onChange={(e) => setBatchBadge(e.target.value)}
                          className="w-full p-2 border rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#8B0024]"
                        >
                          <option value="">Sin insignia</option>
                          {BADGES.filter(Boolean).map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Selector de Adicionales en Masa */}
                    {availableAddons.length > 0 && (
                      <div className="pt-2 border-t border-gray-200">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Gift size={12} className="text-[#8B0024]" /> Adicionales que Aplican a este Lote:
                        </label>

                        <div className="flex flex-wrap gap-2">
                          {availableAddons.map((addon) => {
                            const isSelected = batchAddons.includes(addon._id);
                            return (
                              <button
                                key={addon._id}
                                type="button"
                                onClick={() => toggleAddonSelection(addon._id)}
                                className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1.5 ${
                                  isSelected
                                    ? "bg-[#8B0024] text-white border-[#8B0024] shadow-sm"
                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                }`}
                              >
                                {isSelected ? <CheckSquare size={12} /> : <Square size={12} />}
                                <span>{addon.name} (+${addon.price})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Grid de Productos Individuales del Lote */}
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.products.map((prod) => (
                      <div
                        key={prod._id}
                        className="bg-white border rounded-2xl p-4 shadow-sm relative space-y-3 hover:shadow-md transition-shadow"
                      >
                        <div className="flex gap-3">
                          <img
                            src={prod.images?.[0] || "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=800"}
                            alt={prod.name}
                            className="w-16 h-16 rounded-xl object-cover border flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-xs text-gray-900 block truncate">
                              {prod.name}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-black text-[#8B0024]">${prod.price?.toFixed(2)}</span>
                              <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-bold">
                                {prod.category}
                              </span>
                            </div>
                            {prod.flowerCount ? (
                              <span className="text-[10px] text-pink-600 font-bold block mt-0.5">
                                🌹 {prod.flowerCount} Rosas {prod.bouquetType ? `• ${prod.bouquetType}` : ''}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t text-xs">
                          <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Pausado / Pre-Agregado ⏸️
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeletePreProduct(prod._id, prod.name)}
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
