"use client";

import React, { useState, useRef } from "react";
import { IKContext, IKUpload } from "imagekitio-react";
import { Upload, X, Loader2, Link as LinkIcon } from "lucide-react";

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

interface SingleImageUploaderProps {
  name?: string;
  label: string;
  defaultValue?: string;
  currentImage?: string;
  recommendation?: string;
  required?: boolean;
  onImageUploaded?: (url: string) => void;
}

export function SingleImageUploader({
  name = "image",
  label,
  defaultValue = "",
  currentImage,
  recommendation,
  required = false,
  onImageUploaded,
}: SingleImageUploaderProps) {
  const [imageUrl, setImageUrl] = useState<string>(currentImage || defaultValue);
  const [uploading, setUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const ikUploadRef = useRef<HTMLInputElement>(null);

  const prevPropRef = useRef(currentImage || defaultValue);

  React.useEffect(() => {
    const propVal = currentImage || defaultValue || "";
    if (propVal !== prevPropRef.current) {
      setImageUrl(propVal);
      prevPropRef.current = propVal;
    }
  }, [currentImage, defaultValue]);

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
      setImageUrl(res.url);
      onImageUploaded?.(res.url);
    }
  };

  const handleRemove = () => {
    setImageUrl("");
    onImageUploaded?.("");
  };

  const handleAddManualUrl = () => {
    if (!manualUrl.trim()) return;
    const url = manualUrl.trim();
    setImageUrl(url);
    onImageUploaded?.(url);
    setManualUrl("");
    setShowManualInput(false);
  };

  return (
    <div className="space-y-2 border p-4 rounded-xl bg-gray-50/50">
      {/* Input oculto para el formulario HTML */}
      <input type="hidden" name={name} value={imageUrl} required={required && !imageUrl} />

      <div className="flex justify-between items-center">
        <div>
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          {recommendation && (
            <span className="text-[11px] text-gray-400 font-normal">{recommendation}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-xs text-[#FF97A4] font-bold hover:underline flex items-center gap-1"
        >
          <LinkIcon size={12} />
          {showManualInput ? "Ocultar URL manual" : "Agregar URL manual"}
        </button>
      </div>

      {showManualInput && (
        <div className="flex gap-2 p-2 bg-white border rounded-lg animate-in fade-in duration-200">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://ejemplo.com/banner.jpg"
            className="flex-1 p-2 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FF97A4]"
          />
          <button
            type="button"
            onClick={handleAddManualUrl}
            className="bg-[#1A1C1C] text-white px-3 py-1 text-xs font-bold rounded hover:bg-black transition-colors"
          >
            Añadir
          </button>
        </div>
      )}

      <IKContext publicKey={publicKey} urlEndpoint={urlEndpoint} authenticator={authenticator}>
        <IKUpload
          ref={ikUploadRef}
          onError={handleUploadError}
          onSuccess={handleUploadSuccess}
          onUploadStart={handleUploadStart}
          style={{ display: "none" }}
          folder="/sliders"
          accept="image/*,video/*"
        />

        {imageUrl ? (
          <div className="relative group border rounded-xl overflow-hidden bg-black/5 aspect-[16/6] max-h-48 flex items-center justify-center">
            {imageUrl.match(/\.(mp4|webm|ogg)$/i) ? (
              <video src={imageUrl} controls className="w-full h-full object-cover" />
            ) : (
              <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => ikUploadRef.current?.click()}
                className="bg-white text-gray-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow hover:bg-gray-100 transition-colors"
              >
                Cambiar Imagen
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="bg-red-600 text-white p-1.5 rounded-lg text-xs font-bold shadow hover:bg-red-700 transition-colors"
                title="Eliminar imagen"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => !uploading && ikUploadRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-1.5 ${
              uploading
                ? "bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed"
                : "border-[#FF97A4]/50 bg-white hover:bg-[#FF97A4]/5 hover:border-[#FF97A4]"
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin text-[#FF97A4]" size={24} />
                <p className="text-xs font-bold text-gray-600">Subiendo a ImageKit...</p>
              </>
            ) : (
              <>
                <div className="p-2 bg-[#FF97A4]/10 rounded-full text-[#FF97A4]">
                  <Upload size={20} />
                </div>
                <p className="text-xs font-bold text-gray-700">Subir {label} a ImageKit</p>
                <p className="text-[10px] text-gray-400">Haz clic aquí para seleccionar tu archivo</p>
              </>
            )}
          </div>
        )}
      </IKContext>
    </div>
  );
}
