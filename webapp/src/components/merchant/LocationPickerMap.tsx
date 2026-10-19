'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Navigation, Compass, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface LocationPickerMapProps {
  lat: string;
  lon: string;
  onChange: (lat: string, lon: string) => void;
  shopName?: string;
  error?: string | null;
}

const ADDIS_NEIGHBORHOODS = [
  { name: 'Bole', lat: 9.0054, lon: 38.784 },
  { name: 'Piassa', lat: 9.0345, lon: 38.752 },
  { name: 'Kazanchis', lat: 9.018, lon: 38.771 },
  { name: 'Sarbet', lat: 8.995, lon: 38.736 },
  { name: 'Mexico', lat: 9.0105, lon: 38.744 },
  { name: 'Megenagna', lat: 9.021, lon: 38.802 },
  { name: 'CMC', lat: 9.022, lon: 38.845 },
  { name: 'Gerji', lat: 8.998, lon: 38.805 },
] as const;

export default function LocationPickerMap({
  lat,
  lon,
  onChange,
  shopName = 'Your Shop',
  error,
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showManualInputs, setShowManualInputs] = useState(false);
  const [activeArea, setActiveArea] = useState<string>('Bole');

  const currentLat = parseFloat(lat) || 9.0054;
  const currentLon = parseFloat(lon) || 38.784;

  const isWithinAddis =
    currentLat >= 8.8 && currentLat <= 9.15 && currentLon >= 38.6 && currentLon <= 38.95;

  // Find closest neighborhood name for friendly feedback
  const getNearestNeighborhood = useCallback((tLat: number, tLon: number): string => {
    let closestName = 'Addis Ababa';
    let minDistance = Infinity;

    for (const n of ADDIS_NEIGHBORHOODS) {
      const d = Math.hypot(n.lat - tLat, n.lon - tLon);
      if (d < minDistance) {
        minDistance = d;
        closestName = n.name;
      }
    }
    return closestName;
  }, []);

  // Update marker position and map center
  const updatePosition = useCallback(
    (newLat: number, newLon: number, panMap = false) => {
      const formattedLat = newLat.toFixed(5);
      const formattedLon = newLon.toFixed(5);
      onChange(formattedLat, formattedLon);

      const nearest = getNearestNeighborhood(newLat, newLon);
      setActiveArea(nearest);

      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLon]);
      }
      if (panMap && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([newLat, newLon], 16, { duration: 0.8 });
      }
    },
    [onChange, getNearestNeighborhood]
  );

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let isSubscribed = true;

    const initLeaflet = async () => {
      try {
        const L = (await import('leaflet')).default;
        if (!isSubscribed || !mapContainerRef.current) return;

        // If map already initialized, just set view
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([currentLat, currentLon]);
          if (markerRef.current) {
            markerRef.current.setLatLng([currentLat, currentLon]);
          }
          return;
        }

        const map = L.map(mapContainerRef.current, {
          center: [currentLat, currentLon],
          zoom: 15,
          zoomControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        // Custom Shop Pin Icon
        const pinIcon = L.divIcon({
          className: 'merchant-location-pin',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
              <div style="
                background: linear-gradient(135deg, #15803d 0%, #059669 100%);
                color: #ffffff;
                padding: 5px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 800;
                box-shadow: 0 4px 14px rgba(5, 150, 105, 0.45);
                border: 2px solid #ffffff;
                white-space: nowrap;
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: grab;
              ">
                <span>📍</span>
                <span>${shopName || 'Shop Location'}</span>
              </div>
              <div style="
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 8px solid #059669;
                margin-top: -1px;
              "></div>
              <div style="
                width: 8px;
                height: 8px;
                background: #0f172a;
                border-radius: 50%;
                margin-top: 2px;
                opacity: 0.35;
              "></div>
            </div>
          `,
          iconSize: [120, 48],
          iconAnchor: [60, 48],
        });

        // Draggable shop marker
        const marker = L.marker([currentLat, currentLon], {
          icon: pinIcon,
          draggable: true,
          autoPan: true,
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          updatePosition(pos.lat, pos.lng);
        });

        // Click anywhere on map to reposition pin
        map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
          updatePosition(e.latlng.lat, e.latlng.lng, true);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } catch (e) {
        console.warn('Leaflet initialization error:', e);
      }
    };

    initLeaflet();

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Handle GPS "Use My Location"
  const handleLocateMe = () => {
    setGeoError(null);
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const uLat = pos.coords.latitude;
        const uLon = pos.coords.longitude;

        if (uLat < 8.8 || uLat > 9.15 || uLon < 38.6 || uLon > 38.95) {
          setGeoError('Current location detected outside Addis Ababa. Please tap inside Addis Ababa on the map.');
          updatePosition(uLat, uLon, true);
        } else {
          setGeoError(null);
          updatePosition(uLat, uLon, true);
        }
      },
      () => {
        setIsLocating(false);
        setGeoError('Could not retrieve GPS location. Please tap your shop location on the map.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-3">
      {/* Top Map Action Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-700 font-semibold">
          <MapPin className="w-4 h-4 text-green-600 shrink-0" />
          <span>Tap on map or drag pin to your shop entrance</span>
        </div>

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="min-h-[38px] text-xs font-bold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-green-200 shadow-xs"
        >
          <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Locating...' : 'Use My Current Location'}</span>
        </button>
      </div>

      {/* Quick Neighborhood Preset Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
          <Compass className="w-3.5 h-3.5 text-gray-400" />
          Quick Jump:
        </span>
        {ADDIS_NEIGHBORHOODS.map((hood) => {
          const isSelected = activeArea === hood.name;
          return (
            <button
              key={hood.name}
              type="button"
              onClick={() => updatePosition(hood.lat, hood.lon, true)}
              className={`min-h-[30px] px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-green-600 text-white shadow-xs font-bold'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {hood.name}
            </button>
          );
        })}
      </div>

      {/* Interactive Leaflet Map Canvas */}
      <div className="relative w-full h-[300px] sm:h-[340px] rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-100 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Center Target Crosshair Hint */}
        <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200 text-[11px] text-gray-700 shadow-sm flex items-center gap-1.5 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>📍 Pin placed near <strong>{activeArea}</strong></span>
        </div>
      </div>

      {/* Selected Location Confirmation Badge */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-emerald-900">
            Selected Shop Area: <strong>{activeArea}, Addis Ababa</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowManualInputs(!showManualInputs)}
          className="text-emerald-700 hover:underline font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <span>{showManualInputs ? 'Hide numbers' : 'View coordinates'}</span>
          {showManualInputs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Boundary Warning */}
      {!isWithinAddis && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <span>
            The selected pin is outside standard Addis Ababa coverage boundaries. Please drag the pin inside Addis Ababa.
          </span>
        </div>
      )}

      {/* Geolocation / Validation Errors */}
      {(geoError || error) && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{geoError || error}</span>
        </div>
      )}

      {/* Optional Collapsed Coordinate Inputs */}
      {showManualInputs && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl grid grid-cols-2 gap-3 text-xs animate-fade-in">
          <div>
            <label className="block text-gray-600 font-semibold mb-1">Exact Latitude</label>
            <input
              type="number"
              step="0.00001"
              value={lat}
              onChange={(e) => updatePosition(parseFloat(e.target.value) || 9.0054, currentLon, true)}
              className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono text-gray-900"
            />
          </div>
          <div>
            <label className="block text-gray-600 font-semibold mb-1">Exact Longitude</label>
            <input
              type="number"
              step="0.00001"
              value={lon}
              onChange={(e) => updatePosition(currentLat, parseFloat(e.target.value) || 38.784, true)}
              className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono text-gray-900"
            />
          </div>
        </div>
      )}
    </div>
  );
}
