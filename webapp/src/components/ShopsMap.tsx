'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { NearbyDeal } from '@/lib/api';
import {
  Navigation,
  Layers,
  Compass,
  Maximize2,
  Minimize2,
  Zap,
} from 'lucide-react';

interface ShopsMapProps {
  userLat: number;
  userLon: number;
  radiusMeters: number;
  deals: NearbyDeal[];
  onSelectDeal: (deal: NearbyDeal) => void;
  onClaimDeal?: (deal: NearbyDeal) => void;
  onChangeRadius?: (radius: number) => void;
  onLocateMe?: () => void;
  className?: string;
}

export const ShopsMap: React.FC<ShopsMapProps> = ({
  userLat,
  userLon,
  radiusMeters,
  deals,
  onSelectDeal,
  onClaimDeal,
  onChangeRadius,
  onLocateMe,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const [mapMode, setMapMode] = useState<'osm' | 'radar'>('osm');
  const [selectedMapDeal, setSelectedMapDeal] = useState<NearbyDeal | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Helper for category icons
  const getCategoryIconSvg = (cat: string) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('cafe') || c.includes('coffee')) return '☕';
    if (c.includes('bakery') || c.includes('pastry')) return '🥐';
    if (c.includes('restaurant') || c.includes('food')) return '🍽️';
    if (c.includes('pharmacy') || c.includes('health')) return '💊';
    if (c.includes('barber') || c.includes('salon')) return '✂️';
    if (c.includes('grocery') || c.includes('supermarket')) return '🛒';
    return '🏷️';
  };

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (mapMode !== 'osm') return;
    if (!mapContainerRef.current) return;

    let isSubscribed = true;

    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default;
        if (!isSubscribed) return;

        if (!mapInstanceRef.current && mapContainerRef.current) {
          const map = L.map(mapContainerRef.current, {
            center: [userLat, userLon],
            zoom: 15,
            zoomControl: false,
          });

          L.control.zoom({ position: 'bottomright' }).addTo(map);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(map);

          mapInstanceRef.current = map;
        }

        const map = mapInstanceRef.current;
        if (!map) return;

        map.setView([userLat, userLon], 15);

        // Clear existing markers & shapes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker || layer instanceof L.Circle) {
            map.removeLayer(layer);
          }
        });

        // 1. User Position & Radius Boundary Circle
        L.circle([userLat, userLon], {
          radius: radiusMeters,
          color: '#059669',
          fillColor: '#10b981',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '5, 5',
        }).addTo(map);

        const userIcon = L.divIcon({
          className: 'custom-user-pin',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;">
              <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(37, 99, 235, 0.25); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; width: 18px; height: 18px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"></div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        L.marker([userLat, userLon], { icon: userIcon })
          .addTo(map)
          .bindPopup(`
            <div style="text-align: center; padding: 4px;">
              <strong style="color: #0f172a; font-size: 13px;">Your Position</strong>
              <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Addis Ababa Local Zone</div>
            </div>
          `);

        // 2. Deal Shop Markers with Custom Price Badge
        deals.forEach((deal) => {
          if (typeof deal.lat !== 'number' || typeof deal.lon !== 'number') return;

          const iconEmoji = getCategoryIconSvg(deal.category);
          const shopIcon = L.divIcon({
            className: 'custom-deal-pin',
            html: `
              <div style="
                background: linear-gradient(135deg, #065f46 0%, #047857 100%);
                color: #ffffff;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 800;
                border: 2px solid #ffffff;
                box-shadow: 0 4px 12px rgba(4, 120, 87, 0.45);
                white-space: nowrap;
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
                transition: transform 0.15s ease;
              " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                <span>${iconEmoji}</span>
                <span style="letter-spacing: -0.02em;">${Math.round(deal.finalAmount)} ETB</span>
                <span style="background: #f59e0b; color: #022c22; font-size: 9px; font-weight: 900; padding: 1px 4px; border-radius: 6px;">-${deal.discountPct}%</span>
              </div>
            `,
            iconSize: [84, 28],
            iconAnchor: [42, 28],
          });

          const marker = L.marker([deal.lat, deal.lon], { icon: shopIcon }).addTo(map);

          const popupHtml = `
            <div style="min-width: 200px; padding: 4px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
                <span style="font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.04em;">${deal.merchantName}</span>
                <span style="font-size: 10px; font-weight: 800; background: #ecfdf5; color: #059669; padding: 2px 6px; border-radius: 6px; border: 1px solid #a7f3d0;">Approved shop</span>
              </div>
              <div style="font-size: 14px; font-weight: 900; color: #0f172a; line-height: 1.25; margin-bottom: 6px;">
                ${deal.title}
              </div>
              <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 8px;">
                <span style="font-size: 18px; font-weight: 900; color: #047857; font-family: monospace;">${Math.round(deal.finalAmount)} ETB</span>
                <span style="font-size: 12px; color: #94a3b8; text-decoration: line-through; font-family: monospace;">${Math.round(deal.price)} ETB</span>
                <span style="font-size: 10px; font-weight: 800; color: #b45309; background: #fef3c7; padding: 1px 5px; border-radius: 4px;">-${deal.discountPct}%</span>
              </div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                <span>📍 ${deal.distanceMeters || 150}m away</span>
                <span>•</span>
                <span>🚶 ${Math.max(1, Math.round((deal.distanceMeters || 150) / 80))} min walk</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <button id="view-deal-btn-${deal.dealId}" style="
                  background: #f1f5f9;
                  color: #0f172a;
                  border: 1px solid #cbd5e1;
                  padding: 7px 8px;
                  border-radius: 10px;
                  font-size: 11px;
                  font-weight: 700;
                  cursor: pointer;
                  text-align: center;
                ">
                  View Details
                </button>
                <button id="claim-deal-btn-${deal.dealId}" style="
                  background: linear-gradient(to right, #059669, #10b981);
                  color: #ffffff;
                  border: none;
                  padding: 7px 8px;
                  border-radius: 10px;
                  font-size: 11px;
                  font-weight: 800;
                  cursor: pointer;
                  text-align: center;
                  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
                ">
                  Pay with M-PESA
                </button>
              </div>
            </div>
          `;

          marker.bindPopup(popupHtml);

          marker.on('popupopen', () => {
            setSelectedMapDeal(deal);
            const viewBtn = document.getElementById(`view-deal-btn-${deal.dealId}`);
            if (viewBtn) {
              viewBtn.onclick = () => onSelectDeal(deal);
            }
            const claimBtn = document.getElementById(`claim-deal-btn-${deal.dealId}`);
            if (claimBtn) {
              claimBtn.onclick = () => {
                if (onClaimDeal) {
                  onClaimDeal(deal);
                } else {
                  onSelectDeal(deal);
                }
              };
            }
          });
        });
      } catch (err) {
        console.error('Failed to initialize Leaflet map:', err);
      }
    };

    initMap();

    return () => {
      isSubscribed = false;
    };
  }, [mapMode, userLat, userLon, radiusMeters, deals, onSelectDeal, onClaimDeal]);

  // Addis Ababa landmarks for vector radar mode
  const radarLandmarks = useMemo(
    () => [
      { name: 'Edna Mall', x: 55, y: 45 },
      { name: 'Brass Hospital', x: 35, y: 32 },
      { name: 'Bole Atlas', x: 68, y: 56 },
      { name: 'Morning Star', x: 26, y: 72 },
      { name: 'Dembel Center', x: 75, y: 28 },
    ],
    []
  );

  return (
    <div
      className={`relative w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-xl transition-all duration-300 ${
        isExpanded ? 'h-[580px]' : 'h-[390px] sm:h-[430px]'
      } ${className}`}
    >
      {/* Top Map Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2 pointer-events-none">
        {/* Left: Engine Mode Toggle (OSM Street Map vs Radar Vector) */}
        <div className="flex p-0.5 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-lg pointer-events-auto">
          <button
            type="button"
            onClick={() => setMapMode('osm')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapMode === 'osm'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Street Map</span>
          </button>

          <button
            type="button"
            onClick={() => setMapMode('radar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapMode === 'radar'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Radar View</span>
          </button>
        </div>

        {/* Right: Quick Radius & Size Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {onChangeRadius && (
            <div className="flex items-center gap-1 bg-slate-950/85 backdrop-blur-md px-2 py-1 rounded-2xl border border-slate-700/80 shadow-lg text-xs font-semibold text-slate-300">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider hidden sm:inline">
                Radius:
              </span>
              {[500, 1000, 2000, 5000].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onChangeRadius(r)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    radiusMeters === r
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                </button>
              ))}
            </div>
          )}

          {onLocateMe && (
            <button
              type="button"
              onClick={onLocateMe}
              className="p-2 bg-slate-950/85 backdrop-blur-md hover:bg-slate-800 text-emerald-400 rounded-2xl border border-slate-700/80 shadow-lg transition-colors cursor-pointer"
              title="Center on my location"
            >
              <Navigation className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-2 bg-slate-950/85 backdrop-blur-md hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl border border-slate-700/80 shadow-lg transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse Map' : 'Expand Map'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* MAP VIEW CANVAS: OSM Tiles OR Hyperlocal SVG Radar */}
      {mapMode === 'osm' ? (
        <div ref={mapContainerRef} className="w-full h-full z-10" />
      ) : (
        /* Addis Ababa Hyperlocal Vector Radar Map */
        <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
          {/* Schematic Disclaimer Badge */}
          <div className="absolute top-16 left-3 z-20 px-2.5 py-1 rounded-lg bg-slate-950/85 border border-slate-700/80 text-[10px] font-semibold text-slate-300 pointer-events-none backdrop-blur-md">
            Schematic map, not to scale
          </div>

          {/* Radar Grid Lines & Roads */}
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Background Night Terrain */}
            <rect width="100" height="100" fill="#090d16" />

            {/* Hyperlocal Concentric Circles */}
            <circle cx="50" cy="50" r="18" fill="none" stroke="#059669" strokeWidth="0.4" strokeDasharray="1 1.5" opacity="0.4" />
            <circle cx="50" cy="50" r="32" fill="none" stroke="#059669" strokeWidth="0.5" strokeDasharray="1.5 2" opacity="0.35" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="#059669" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.3" />

            {/* Radar Crosshairs */}
            <line x1="50" y1="0" x2="50" y2="100" stroke="#1e293b" strokeWidth="0.5" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" strokeWidth="0.5" />

            {/* Major Arterial Roads */}
            {/* Bole Road / Africa Avenue (Boulevard) */}
            <path d="M 5 15 L 95 85" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 5 15 L 95 85" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" />

            {/* Ring Road Cross */}
            <path d="M 15 95 L 85 5" stroke="#1e293b" strokeWidth="2.8" />
            <path d="M 15 95 L 85 5" stroke="#334155" strokeWidth="1.2" />

            {/* Secondary Connectors */}
            <path d="M 25 35 L 75 35" stroke="#1e293b" strokeWidth="1.2" />
            <path d="M 30 65 L 85 65" stroke="#1e293b" strokeWidth="1.2" />
            <path d="M 50 15 L 50 85" stroke="#1e293b" strokeWidth="1.2" />

            {/* Landmark text labels */}
            {radarLandmarks.map((lm) => (
              <text
                key={lm.name}
                x={lm.x}
                y={lm.y}
                fontSize="2.4"
                fill="#64748b"
                fontWeight="700"
                opacity="0.85"
                textAnchor="middle"
              >
                {lm.name}
              </text>
            ))}
          </svg>

          {/* User Location Center Beacon ("You are here") */}
          <div
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
            style={{ left: '50%', top: '50%' }}
          >
            <div className="relative flex items-center justify-center">
              <span className="absolute w-9 h-9 rounded-full bg-blue-500/25 animate-ping" />
              <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center text-white">
                <Navigation className="w-2.5 h-2.5 fill-white" />
              </div>
            </div>
            <div className="bg-slate-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md mt-1 border border-slate-700 whitespace-nowrap">
              You are here
            </div>
          </div>

          {/* Radar Interactive Shop Pins */}
          {deals.map((deal, idx) => {
            // Generate stable relative offsets around center (50, 50)
            const angle = (idx * 55 + (deal.distanceMeters || 120)) % 360;
            const dist = Math.min(42, Math.max(14, (deal.distanceMeters || 200) / 45));
            const rad = (angle * Math.PI) / 180;
            const leftPct = 50 + dist * Math.cos(rad);
            const topPct = 50 + dist * Math.sin(rad);

            const isSelected = selectedMapDeal?.dealId === deal.dealId;

            return (
              <div
                key={deal.dealId}
                onClick={() => {
                  setSelectedMapDeal(deal);
                }}
                className="absolute z-20 -translate-x-1/2 -translate-y-full cursor-pointer group transition-transform hover:scale-110 active:scale-95"
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`px-2.5 py-1 rounded-xl shadow-xl flex items-center gap-1.5 whitespace-nowrap border transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 font-black border-white ring-4 ring-emerald-500/30 scale-105'
                        : 'bg-slate-900/95 text-white border-emerald-500/50 hover:border-emerald-400'
                    }`}
                  >
                    <span className="text-xs">{getCategoryIconSvg(deal.category)}</span>
                    <span className="text-xs font-black font-mono">
                      {Math.round(deal.finalAmount)} ETB
                    </span>
                    <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-md">
                      -{deal.discountPct}%
                    </span>
                  </div>
                  <div
                    className={`w-2 h-2 rotate-45 -mt-1 shadow-xs ${
                      isSelected ? 'bg-emerald-500' : 'bg-slate-900 border-r border-b border-emerald-500/50'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Deal Overlay Card (Quick Action Strip at Bottom) */}
      {selectedMapDeal && (
        <div className="absolute bottom-3 left-3 right-3 z-30 bg-slate-950/95 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-3.5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-lg shrink-0">
              {getCategoryIconSvg(selectedMapDeal.category)}
            </div>
            <div className="truncate flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider truncate">
                  {selectedMapDeal.merchantName}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  • {selectedMapDeal.distanceMeters || 150}m away
                </span>
              </div>
              <h4 className="text-sm font-black text-white truncate">
                {selectedMapDeal.title}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end shrink-0">
            <div className="text-right mr-1">
              <div className="text-base font-black text-emerald-400 font-mono leading-none">
                {Math.round(selectedMapDeal.finalAmount)} ETB
              </div>
              <div className="text-[11px] text-slate-400 line-through font-mono">
                {Math.round(selectedMapDeal.price)} ETB
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectDeal(selectedMapDeal)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Details
            </button>

            <button
              type="button"
              onClick={() => {
                if (onClaimDeal) {
                  onClaimDeal(selectedMapDeal);
                } else {
                  onSelectDeal(selectedMapDeal);
                }
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Pay with M-PESA</span>
            </button>
          </div>
        </div>
      )}

      {/* Map Legend Overlay Indicator */}
      <div className="absolute bottom-3 left-3 z-20 pointer-events-none hidden md:flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-300">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>{deals.length} approved shops in Bole</span>
        <span className="text-slate-500">•</span>
        <span className="text-slate-400">Tap pin to view and pay with M-PESA</span>
      </div>
    </div>
  );
};
