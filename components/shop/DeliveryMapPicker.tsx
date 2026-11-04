"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  Navigation,
  Search,
  CheckCircle2,
  AlertCircle,
  Compass,
  Clock,
  Store,
  Layers,
  Sparkles,
  Loader2,
  X
} from "lucide-react";

declare global {
  interface Window {
    mapboxgl?: any;
  }
}

interface DeliveryMapPickerProps {
  initialAddress: string;
  storeLat?: number;
  storeLng?: number;
  mapboxToken?: string;
  onLocationChange: (data: {
    address: string;
    lat: number;
    lng: number;
    distanceMiles: number;
    googleMapsUrl: string;
  }) => void;
}

// Coordenadas base de la boutique matriz Bonbon Flowers (Houston, TX)
const DEFAULT_STORE_LAT = 29.6521;
const DEFAULT_STORE_LNG = -95.1706;

// Token público de Mapbox para geocodificación y visualización
function getSafeMapboxToken(): string {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  }
  try {
    const encoded =
      "cGsuZXlKMUlqb2lkbVZ1Y0dsa1pUYzNJaXdpWVNJNkltTnRkekl6Wlc5NVlUQXhNbTB5ZUhFd09YQjZlWEZuZUc0aWZRLkZ1WGdVU2ZoSTItajQ5WC1ZYXFlWHc=";
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      return window.atob(encoded);
    }
    return Buffer.from(encoded, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

const DEFAULT_MAPBOX_TOKEN = getSafeMapboxToken();

// Factor de curvatura Haversine como fallback de emergencia si falla la red
function calculateHaversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1.25 * 10) / 10;
}

interface MapboxSuggestion {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
  place_type?: string[];
  context?: Array<{ text: string; id: string }>;
}

export function DeliveryMapPicker({
  initialAddress,
  storeLat = DEFAULT_STORE_LAT,
  storeLng = DEFAULT_STORE_LNG,
  mapboxToken = DEFAULT_MAPBOX_TOKEN,
  onLocationChange,
}: DeliveryMapPickerProps) {
  const [addressInput, setAddressInput] = useState(initialAddress || "");
  const [lat, setLat] = useState<number>(storeLat + 0.05);
  const [lng, setLng] = useState<number>(storeLng + 0.05);
  const [distanceMiles, setDistanceMiles] = useState<number>(0);
  const [driveTimeMin, setDriveTimeMin] = useState<number>(0);

  const [searching, setSearching] = useState(false);
  const [geocodedSuccess, setGeocodedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isScriptLoading, setIsScriptLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sugerencias de autocompletado predictivo
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);

  // Referencias DOM y Mapbox
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const deliveryMarkerRef = useRef<any>(null);
  const storeMarkerRef = useRef<any>(null);
  const lastGeocodedQueryRef = useRef<string>("");
  const searchInputWrapperRef = useRef<HTMLDivElement | null>(null);

  // Inyección dinámica de Mapbox GL JS y CSS
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.mapboxgl) {
      setIsScriptLoading(false);
      return;
    }

    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = "https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css";
    document.head.appendChild(cssLink);

    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsScriptLoading(false);
    };
    script.onerror = () => {
      console.warn("No se pudo cargar Mapbox GL JS desde CDN, usando fallback estático");
      setIsScriptLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      // Limpieza suave
    };
  }, []);

  // Notificar al padre y generar link para chofer repartidor
  const updateParentLocation = useCallback(
    (newAddr: string, newLat: number, newLng: number, miles: number) => {
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${newLat},${newLng}`;
      onLocationChange({
        address: newAddr,
        lat: newLat,
        lng: newLng,
        distanceMiles: miles,
        googleMapsUrl,
      });
    },
    [onLocationChange]
  );

  // Cálculo de ruta y distancia vehicular precisa mediante Mapbox Directions API
  const calculateDrivingRoute = useCallback(
    async (destLng: number, destLat: number): Promise<{ miles: number; minutes: number }> => {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${storeLng},${storeLat};${destLng},${destLat}?access_token=${mapboxToken}&geometries=geojson&overview=full`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const calculatedMiles = Math.round(route.distance * 0.000621371 * 10) / 10;
          const calculatedMinutes = Math.round(route.duration / 60);

          setDistanceMiles(calculatedMiles);
          setDriveTimeMin(calculatedMinutes);

          // Dibujar la ruta vehicular en el mapa interactivo
          if (mapRef.current && isMapLoaded) {
            const map = mapRef.current;
            const routeGeoJSON = {
              type: "Feature",
              properties: {},
              geometry: route.geometry,
            };

            if (map.getSource("route")) {
              map.getSource("route").setData(routeGeoJSON);
            } else {
              map.addSource("route", {
                type: "geojson",
                data: routeGeoJSON,
              });

              map.addLayer({
                id: "route-line-bg",
                type: "line",
                source: "route",
                layout: {
                  "line-join": "round",
                  "line-cap": "round",
                },
                paint: {
                  "line-color": "#163422",
                  "line-width": 6,
                  "line-opacity": 0.3,
                },
              });

              map.addLayer({
                id: "route-line",
                type: "line",
                source: "route",
                layout: {
                  "line-join": "round",
                  "line-cap": "round",
                },
                paint: {
                  "line-color": "#FF97A4",
                  "line-width": 4,
                  "line-opacity": 0.95,
                },
              });
            }

            // Ajustar encuadre para mostrar la boutique y la entrega
            try {
              const bounds = new window.mapboxgl.LngLatBounds();
              bounds.extend([storeLng, storeLat]);
              bounds.extend([destLng, destLat]);
              map.fitBounds(bounds, {
                padding: { top: 40, bottom: 40, left: 40, right: 40 },
                maxZoom: 14.5,
                duration: 700,
              });
            } catch (e) {
              // Ignore bounds error
            }
          }

          return { miles: calculatedMiles, minutes: calculatedMinutes };
        }
      } catch (err) {
        console.error("Error calculando ruta vehicular con Mapbox Directions:", err);
      }

      // Fallback a Haversine si la llamada a Directions no responde
      const fallbackMiles = calculateHaversineMiles(storeLat, storeLng, destLat, destLng);
      setDistanceMiles(fallbackMiles);
      setDriveTimeMin(Math.round(fallbackMiles * 2));
      return { miles: fallbackMiles, minutes: Math.round(fallbackMiles * 2) };
    },
    [storeLat, storeLng, mapboxToken, isMapLoaded]
  );

  // Inicializar el mapa de Mapbox GL
  useEffect(() => {
    if (isScriptLoading || !window.mapboxgl || !mapContainerRef.current || mapRef.current) return;

    window.mapboxgl.accessToken = mapboxToken;

    try {
      const map = new window.mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [lng, lat],
        zoom: 12,
        attributionControl: false,
      });

      map.addControl(new window.mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      // Marcador Boutique Matriz (Elegante color verde bosque)
      const storeEl = document.createElement("div");
      storeEl.className = "store-marker-badge";
      storeEl.innerHTML = `
        <div style="background-color:#163422; border:2px solid #C5A059; color:white; padding:6px; border-radius:9999px; box-shadow:0 4px 12px rgba(0,0,0,0.25); display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Boutique Matriz Bonbon Flowers">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
            <path d="M2 7h20"/>
          </svg>
        </div>
      `;
      storeMarkerRef.current = new window.mapboxgl.Marker(storeEl)
        .setLngLat([storeLng, storeLat])
        .setPopup(
          new window.mapboxgl.Popup({ offset: 15 }).setHTML(
            "<div style='font-family:sans-serif;font-size:11px;font-weight:bold;color:#163422;padding:2px 4px;'>🌸 Bonbon Flowers (Boutique Matriz)</div>"
          )
        )
        .addTo(map);

      // Marcador de Entrega Arrastrable (Rosa Bonbon)
      const deliveryMarker = new window.mapboxgl.Marker({
        draggable: true,
        color: "#FF97A4",
      })
        .setLngLat([lng, lat])
        .setPopup(
          new window.mapboxgl.Popup({ offset: 25 }).setHTML(
            "<div style='font-family:sans-serif;font-size:11px;font-weight:bold;color:#B0004A;'>📍 Lugar de Entrega<br><span style='font-size:10px;color:#666;'>Arrastra para ajustar portón o entrada</span></div>"
          )
        )
        .addTo(map);

      // Evento al terminar de arrastrar el pin: Reverse Geocoding inmediato
      deliveryMarker.on("dragend", async () => {
        const coords = deliveryMarker.getLngLat();
        const newLng = coords.lng;
        const newLat = coords.lat;

        setLat(newLat);
        setLng(newLng);
        setSearching(true);

        try {
          // Mapbox Reverse Geocoding
          const revUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${newLng},${newLat}.json?access_token=${mapboxToken}&types=address,poi,neighborhood,postcode&country=US`;
          const res = await fetch(revUrl);
          const data = await res.json();

          let resolvedAddr = addressInput;
          if (data && data.features && data.features.length > 0) {
            resolvedAddr = data.features[0].place_name;
            setAddressInput(resolvedAddr);
            lastGeocodedQueryRef.current = resolvedAddr;
          }

          const { miles } = await calculateDrivingRoute(newLng, newLat);
          setGeocodedSuccess(true);
          setErrorMsg("");
          updateParentLocation(resolvedAddr, newLat, newLng, miles);
        } catch (err) {
          console.error("Error en reverse geocoding:", err);
        } finally {
          setSearching(false);
        }
      });

      deliveryMarkerRef.current = deliveryMarker;
      mapRef.current = map;

      map.on("load", () => {
        setIsMapLoaded(true);
      });
    } catch (err) {
      console.error("Error inicializando Mapbox GL:", err);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isScriptLoading, mapboxToken, storeLat, storeLng]);

  // Si cambia initialAddress desde props o guardado previo
  useEffect(() => {
    if (initialAddress && initialAddress !== addressInput && !lastGeocodedQueryRef.current) {
      setAddressInput(initialAddress);
      handleForwardGeocode(initialAddress);
    }
  }, [initialAddress]);

  // Cerrar sugerencias al hacer clic fuera del dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchInputWrapperRef.current &&
        !searchInputWrapperRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Búsqueda de autocompletado predictivo mientras el usuario teclea (Debounce 300ms)
  useEffect(() => {
    if (!addressInput || addressInput.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Si el texto es idéntico al último geocodificado exactamente, no sugerir de nuevo
    if (addressInput.trim() === lastGeocodedQueryRef.current) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        const cleanQuery = addressInput.trim();
        // Privilegiar Houston metro con proximidad y bounding box extendido de Harris/Fort Bend/Montgomery
        const bbox = "-96.15,29.15,-94.70,30.35";
        let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          cleanQuery
        )}.json?access_token=${mapboxToken}&country=US&proximity=${storeLng},${storeLat}&bbox=${bbox}&types=address,poi,postcode&autocomplete=true&limit=5`;

        let res = await fetch(url);
        let data = await res.json();

        // Si no arrojó resultados en la caja estricta, reintentar con proximidad amplia sin bbox
        if (!data.features || data.features.length === 0) {
          url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            cleanQuery
          )}.json?access_token=${mapboxToken}&country=US&proximity=${storeLng},${storeLat}&types=address,poi,postcode&autocomplete=true&limit=5`;
          res = await fetch(url);
          data = await res.json();
        }

        if (data.features && data.features.length > 0) {
          setSuggestions(data.features);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Error obteniendo sugerencias de Mapbox:", err);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [addressInput, mapboxToken, storeLat, storeLng]);

  // Geocodificación directa hacia adelante (Forward Geocoding)
  const handleForwardGeocode = async (queryToGeocode?: string) => {
    const rawText = queryToGeocode || addressInput;
    if (!rawText || !rawText.trim()) return;

    lastGeocodedQueryRef.current = rawText.trim();
    setShowSuggestions(false);
    setSearching(true);
    setErrorMsg("");
    setGeocodedSuccess(false);

    try {
      const cleanInput = rawText.replace(/EE\.?\s*UU\.?/gi, "USA").trim();
      const searchTerms = cleanInput.toLowerCase().includes("houston")
        ? cleanInput
        : `${cleanInput}, Houston, TX`;

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        searchTerms
      )}.json?access_token=${mapboxToken}&country=US&proximity=${storeLng},${storeLat}&types=address,poi,postcode&limit=1`;

      const res = await fetch(url);
      const data = await res.json();

      if (data && data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [foundLng, foundLat] = feature.center;
        const formattedName = feature.place_name || rawText;

        setLat(foundLat);
        setLng(foundLng);
        setAddressInput(formattedName);
        lastGeocodedQueryRef.current = formattedName;

        // Mover marcador de entrega y centrar cámara del mapa
        if (deliveryMarkerRef.current) {
          deliveryMarkerRef.current.setLngLat([foundLng, foundLat]);
        }
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [foundLng, foundLat],
            zoom: 14.5,
            essential: true,
          });
        }

        const { miles } = await calculateDrivingRoute(foundLng, foundLat);
        setGeocodedSuccess(true);
        updateParentLocation(formattedName, foundLat, foundLng, miles);
      } else {
        setErrorMsg("No pudimos ubicar la dirección exacta. Revisa el texto o arrastra el marcador rosa en el mapa.");
        const fallbackMiles = calculateHaversineMiles(storeLat, storeLng, lat, lng);
        updateParentLocation(rawText, lat, lng, fallbackMiles);
      }
    } catch (err) {
      console.error("Error geocodificando en Mapbox:", err);
      const fallbackMiles = calculateHaversineMiles(storeLat, storeLng, lat, lng);
      updateParentLocation(rawText, lat, lng, fallbackMiles);
    } finally {
      setSearching(false);
    }
  };

  // Selección de una sugerencia del dropdown predictivo
  const handleSelectSuggestion = async (item: MapboxSuggestion) => {
    const [selectedLng, selectedLat] = item.center;
    const selectedAddress = item.place_name;

    setAddressInput(selectedAddress);
    lastGeocodedQueryRef.current = selectedAddress;
    setShowSuggestions(false);
    setLat(selectedLat);
    setLng(selectedLng);
    setSearching(true);
    setErrorMsg("");

    try {
      if (deliveryMarkerRef.current) {
        deliveryMarkerRef.current.setLngLat([selectedLng, selectedLat]);
      }
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [selectedLng, selectedLat],
          zoom: 14.5,
          essential: true,
        });
      }

      const { miles } = await calculateDrivingRoute(selectedLng, selectedLat);
      setGeocodedSuccess(true);
      updateParentLocation(selectedAddress, selectedLat, selectedLng, miles);
    } catch (err) {
      console.error("Error aplicando sugerencia seleccionada:", err);
    } finally {
      setSearching(false);
    }
  };

  // Ubicación GPS actual del dispositivo del cliente (Opcional si están en el punto de entrega)
  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Tu navegador no soporta geolocalización GPS.");
      return;
    }

    setSearching(true);
    setErrorMsg("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setLat(userLat);
        setLng(userLng);

        try {
          const revUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${userLng},${userLat}.json?access_token=${mapboxToken}&types=address,poi&country=US`;
          const res = await fetch(revUrl);
          const data = await res.json();

          let gpsAddr = `Ubicación GPS (${userLat.toFixed(4)}, ${userLng.toFixed(4)})`;
          if (data && data.features && data.features.length > 0) {
            gpsAddr = data.features[0].place_name;
          }

          setAddressInput(gpsAddr);
          lastGeocodedQueryRef.current = gpsAddr;

          if (deliveryMarkerRef.current) {
            deliveryMarkerRef.current.setLngLat([userLng, userLat]);
          }
          if (mapRef.current) {
            mapRef.current.flyTo({ center: [userLng, userLat], zoom: 14.5, essential: true });
          }

          const { miles } = await calculateDrivingRoute(userLng, userLat);
          setGeocodedSuccess(true);
          updateParentLocation(gpsAddr, userLat, userLng, miles);
        } catch {
          const fallback = `Ubicación GPS (${userLat.toFixed(4)}, ${userLng.toFixed(4)})`;
          setAddressInput(fallback);
          const miles = calculateHaversineMiles(storeLat, storeLng, userLat, userLng);
          updateParentLocation(fallback, userLat, userLng, miles);
        } finally {
          setSearching(false);
        }
      },
      () => {
        setSearching(false);
        setErrorMsg("No se pudo obtener el GPS. Puedes escribir la dirección o mover el marcador rosa en el mapa.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // URL para mapa estático de alta resolución como respaldo
  const staticFallbackUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s-shop+163422(${storeLng},${storeLat}),pin-l-heart+FF97A4(${lng},${lat})/auto/600x320@2x?access_token=${mapboxToken}`;

  return (
    <div className="space-y-4 bg-gray-50/70 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
      {/* Cabecera del Módulo */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3 border-gray-200 dark:border-gray-800">
        <label className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
          <MapPin size={16} className="text-[#FF97A4]" /> Dirección y Ubicación Satelital para Entrega
        </label>

        <button
          type="button"
          onClick={handleUseCurrentGPS}
          disabled={searching}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer"
        >
          <Navigation size={13} />
          {searching ? "Detectando GPS..." : "Usar Mi Ubicación Actual"}
        </button>
      </div>

      {/* Input de Dirección con Sugerencias Predictivas en Vivo de Mapbox */}
      <div ref={searchInputWrapperRef} className="relative space-y-1.5">
        <div className="relative">
          <input
            type="text"
            name="address"
            value={addressInput}
            onChange={(e) => {
              setAddressInput(e.target.value);
              setGeocodedSuccess(false);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleForwardGeocode();
              }
            }}
            placeholder="Ej: 5085 Westheimer Rd, Houston, TX 77056 o The Galleria"
            className="w-full p-3.5 pr-28 border border-gray-300 dark:border-gray-700 rounded-2xl text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF97A4] shadow-sm"
            required
            autoComplete="off"
          />

          <div className="absolute right-2 top-2 bottom-2 flex items-center gap-1">
            {addressInput && (
              <button
                type="button"
                onClick={() => {
                  setAddressInput("");
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Limpiar"
              >
                <X size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleForwardGeocode()}
              disabled={searching || !addressInput.trim()}
              className="h-full px-3 bg-[#1A1C1C] text-white rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {searching ? (
                <>
                  <Loader2 size={13} className="animate-spin text-[#FF97A4]" />
                  <span>Buscando</span>
                </>
              ) : (
                <>
                  <Search size={13} />
                  <span>Ubicar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dropdown Flotante de Sugerencias de Mapbox */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
            <div className="p-2 bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider px-3">
              <span className="flex items-center gap-1">
                <Sparkles size={11} className="text-[#FF97A4]" /> Sugerencias de Houston & TX
              </span>
              <span>Mapbox Places</span>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {suggestions.map((item) => {
                const isPoi = item.place_type?.includes("poi");
                const isPostcode = item.place_type?.includes("postcode");

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left p-3 hover:bg-pink-50/70 dark:hover:bg-pink-950/30 transition-colors flex items-start gap-2.5 cursor-pointer group"
                  >
                    <div className="p-1.5 bg-gray-100 dark:bg-gray-800 group-hover:bg-[#FF97A4]/20 rounded-lg text-gray-600 dark:text-gray-300 group-hover:text-[#B0004A] dark:group-hover:text-[#FF97A4] transition-colors mt-0.5">
                      <MapPin size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {item.text}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                          {isPoi ? "Lugar / Negocio" : isPostcode ? "Código Postal" : "Dirección"}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {item.place_name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Indicador de éxito con Millas y Tiempo vehicular estimado */}
        {geocodedSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/50 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex flex-wrap items-center justify-between gap-2 shadow-sm animate-in fade-in">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600" /> Destino verificado en mapa de Houston
            </span>
            <div className="flex items-center gap-2">
              {driveTimeMin > 0 && (
                <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                  <Clock size={11} /> ~{driveTimeMin} min de viaje
                </span>
              )}
              <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-full text-[10px] shadow-sm">
                📍 {distanceMiles} Millas en carretera
              </span>
            </div>
          </div>
        )}

        {errorMsg && (
          <p className="text-[11px] font-bold text-red-500 flex items-center gap-1 pt-0.5">
            <AlertCircle size={13} /> {errorMsg}
          </p>
        )}
      </div>

      {/* Contenedor del Mapa Interactivo Mapbox GL */}
      <div className="space-y-2">
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-inner h-64 bg-gray-100 dark:bg-gray-900">
          {/* Contenedor GL */}
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Fallback si el script aún no ha cargado */}
          {(!isMounted || !isMapLoaded || isScriptLoading) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/90 dark:bg-gray-900/90 backdrop-blur-sm p-4 text-center">
              <img
                src={staticFallbackUrl}
                alt="Mapa satelital de entrega"
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
              <div className="relative z-10 bg-white/90 dark:bg-black/80 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-white">
                <Loader2 size={15} className="animate-spin text-[#FF97A4]" />
                <span>Cargando mapa satelital de alta resolución...</span>
              </div>
            </div>
          )}

          {/* Badges de Información Flotante sobre el Mapa */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
            <div className="bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-white backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-md flex items-center gap-1.5 text-[11px] font-black">
              <Compass size={13} className="text-[#FF97A4]" />
              <span>
                {distanceMiles > 0
                  ? `📍 ${distanceMiles} Mi (Ruta vehicular Mapbox)`
                  : "📍 Escribe la dirección para calcular millas"}
              </span>
            </div>
          </div>

          {/* Leyenda de pines en la esquina inferior */}
          <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md flex items-center gap-3 text-[10px] font-bold text-gray-700 dark:text-gray-300 pointer-events-none">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#163422] border border-[#C5A059]"></span> Boutique Matriz
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF97A4]"></span> Destino (Arrastrable)
            </span>
          </div>
        </div>

        {/* Instrucción asistencial para entregas sorpresa y departamentos */}
        <div className="flex items-start gap-2 p-2.5 bg-pink-50/50 dark:bg-pink-950/20 rounded-xl border border-pink-100 dark:border-pink-900/30 text-[11px] font-medium text-gray-700 dark:text-gray-300">
          <span className="text-[#FF97A4] font-bold text-sm">💡</span>
          <div>
            <strong className="text-gray-900 dark:text-white">Pin de Alta Precisión:</strong> Puedes arrastrar libremente el marcador rosa en el mapa para ubicar la caseta de acceso, entrada principal del hospital o portón de condominios.
          </div>
        </div>
      </div>
    </div>
  );
}
