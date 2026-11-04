"use client";

import React, { useState, useRef } from "react";
import { IKContext, IKUpload } from "imagekitio-react";
import { Upload, X, Star, Loader2, Plus, Link as LinkIcon, MoveLeft, MoveRight } from "lucide-react";

const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/k00oav4la";
const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "public_YuXO1v+TwY0jYouCF4REzzh/MD0=";

const authenticator = async () => {
  try {
    const response = await fetch("/api/imagekit-auth");
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error en auth API: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    return {
      signature: data.signature,
      expire: data.expire,
      token: data.token,
    };
  } catch (error: any) {
    console.error("Error al autenticar ImageKit:", error);
    throw error;
  }
};

interface ImageUploaderProps {
  defaultImages?: string[];
  maxImages?: number;
}

export function ImageUploader({ defaultImages = [], maxImages = 7 }: ImageUploaderProps) {
  const [images, setImages] = useState<string[]>(defaultImages);
  const [uploading, setUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const ikUploadRef = useRef<HTMLInputElement>(null);

  const handleUploadStart = () => {
    setUploading(true);
  };

  const handleUploadError = (err: any) => {
    console.error("Error cargando imagen en ImageKit:", err);
    alert("Hubo un error al subir la imagen. Por favor intenta de nuevo.");
    setUploading(false);
  };

  const handleUploadSuccess = (res: any) => {
    setUploading(false);
    if (res && res.url) {
      if (images.length < maxImages) {
        setImages((prev) => [...prev, res.url]);
      } else {
        alert(`Se ha alcanzado el límite máximo de ${maxImages} imágenes.`);
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    const updated = [...images];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setImages(updated);
  };

  const handleAddManualUrl = () => {
    if (!manualUrl.trim()) return;
    if (images.length >= maxImages) {
      alert(`Se ha alcanzado el límite máximo de ${maxImages} imágenes.`);
      return;
    }
    setImages((prev) => [...prev, manualUrl.trim()]);
    setManualUrl("");
    setShowManualInput(false);
  };

  return (
    <div className="space-y-4">
      {/* Inputs ocultos para enviar todas las URLs en el formulario HTML */}
      {images.map((url, idx) => (
        <input key={`${url}-${idx}`} type="hidden" name="images" value={url} />
      ))}

      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Imágenes del Producto ({images.length} / {maxImages})
        </label>
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-xs text-[#FF97A4] font-bold hover:underline flex items-center gap-1"
        >
          <LinkIcon size={12} />
          {showManualInput ? "Ocultar URL manual" : "Agregar URL manual"}
        </button>
      </div>

      {/* Campo opcional de URL Manual */}
      {showManualInput && (
        <div className="flex gap-2 p-3 bg-gray-50 border rounded-xl animate-in fade-in duration-200">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://ejemplo.com/imagen.jpg"
            className="flex-1 p-2 border text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF97A4]"
          />
          <button
            type="button"
            onClick={handleAddManualUrl}
            className="bg-[#1A1C1C] text-white px-4 py-2 text-xs font-bold rounded-lg hover:bg-black transition-colors"
          >
            Añadir
          </button>
        </div>
      )}

      {/* Contexto e Integrador de ImageKit */}
      <IKContext publicKey={publicKey} urlEndpoint={urlEndpoint} authenticator={authenticator}>
        <IKUpload
          ref={ikUploadRef}
          onError={handleUploadError}
          onSuccess={handleUploadSuccess}
          onUploadStart={handleUploadStart}
          style={{ display: "none" }}
          folder="/products"
          accept="image/*"
        />

        {/* Zona de Botón / Dropzone */}
        {images.length < maxImages && (
          <div
            onClick={() => !uploading && ikUploadRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
              uploading
                ? "bg-gray-50 border-gray-300 opacity-60 cursor-not-allowed"
                : "border-[#FF97A4]/50 bg-[#FF97A4]/5 hover:bg-[#FF97A4]/10 hover:border-[#FF97A4]"
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin text-[#FF97A4]" size={32} />
                <p className="text-sm font-bold text-gray-600">Subiendo a ImageKit...</p>
              </>
            ) : (
              <>
                <div className="p-3 bg-white rounded-full shadow-sm text-[#FF97A4]">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-bold text-gray-700">Haz clic para subir imagen a ImageKit</p>
                <p className="text-xs text-gray-400">Soporta JPG, PNG, WEBP (Máximo {maxImages} fotos)</p>
              </>
            )}
          </div>
        )}
      </IKContext>

      {/* Lista / Grid de Imágenes Subidas */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
          {images.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="relative group border rounded-xl overflow-hidden bg-gray-50 aspect-square flex items-center justify-center shadow-sm"
            >
              <img src={url} alt={`Producto ${idx + 1}`} className="w-full h-full object-cover" />

              {/* Insignia de Portada / Principal */}
              {idx === 0 && (
                <div className="absolute top-2 left-2 bg-[#1A1C1C] text-[#FF97A4] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                  <Star size={10} className="fill-[#FF97A4]" /> Principal
                </div>
              )}

              {/* Superposición de Acciones al pasar el mouse */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] text-white font-bold bg-black/40 px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                    title="Eliminar imagen"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex justify-center gap-2">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMoveImage(idx, idx - 1)}
                      className="bg-white/20 text-white p-1 rounded hover:bg-white/40 transition-colors"
                      title="Mover a la izquierda"
                    >
                      <MoveLeft size={14} />
                    </button>
                  )}
                  {idx < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMoveImage(idx, idx + 1)}
                      className="bg-white/20 text-white p-1 rounded hover:bg-white/40 transition-colors"
                      title="Mover a la derecha"
                    >
                      <MoveRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
