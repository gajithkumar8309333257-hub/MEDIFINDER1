import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Hospital, UserCoordinates, CrowdLevel } from '../types';

interface HospitalMapProps {
  hospitals: Hospital[];
  userLocation: UserCoordinates | null;
  selectedHospitalId?: string | null;
  onSelectHospital: (hospital: Hospital) => void;
  hospitalCrowdLevels?: Record<string, CrowdLevel>;
}

export const HospitalMap: React.FC<HospitalMapProps> = ({
  hospitals,
  userLocation,
  selectedHospitalId,
  onSelectHospital,
  hospitalCrowdLevels = {},
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center: Hyderabad (17.4065, 78.4772)
    const initialLat = userLocation?.latitude ?? 17.4156;
    const initialLng = userLocation?.longitude ?? 78.4124;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 12,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when hospitals or selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // User location marker
    if (userLocation) {
      const userMarkerIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
            <div class="w-8 h-8 bg-blue-400 rounded-full opacity-40 animate-ping absolute"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker([userLocation.latitude, userLocation.longitude], {
        icon: userMarkerIcon,
        zIndexOffset: 1000,
      })
        .bindTooltip('Your Current Location', { permanent: false, direction: 'top' })
        .addTo(layerGroup);
    }

    // Hospital markers
    hospitals.forEach((hosp) => {
      const isSelected = hosp.id === selectedHospitalId;
      const crowd = hospitalCrowdLevels[hosp.id] || 'unknown';

      let crowdColor = '#10b981'; // low (green)
      if (crowd === 'moderate') crowdColor = '#f59e0b'; // moderate (amber)
      if (crowd === 'high') crowdColor = '#ef4444'; // high (red)
      if (crowd === 'unknown') crowdColor = '#64748b';

      const iconHtml = `
        <div class="cursor-pointer transform transition duration-200 hover:scale-125 flex flex-col items-center">
          <div style="background-color: ${crowdColor};" class="w-8 h-8 rounded-full border-2 ${
        isSelected ? 'border-indigo-900 ring-4 ring-indigo-400 scale-110' : 'border-white shadow-lg'
      } flex items-center justify-center text-white font-bold text-xs shadow-md">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 10.5h-5.5V5a1.5 1.5 0 0 0-3 0v5.5H5a1.5 1.5 0 0 0 0 3h5.5V19a1.5 1.5 0 0 0 3 0v-5.5H19a1.5 1.5 0 0 0 0-3z"/>
            </svg>
          </div>
          <div class="bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow mt-0.5 whitespace-nowrap font-medium max-w-[120px] truncate">
            ${hosp.name.split(',')[0]}
          </div>
        </div>
      `;

      const marker = L.marker([hosp.latitude, hosp.longitude], {
        icon: L.divIcon({
          className: 'hospital-map-icon',
          html: iconHtml,
          iconSize: [40, 50],
          iconAnchor: [20, 25],
        }),
      });

      marker.on('click', () => {
        onSelectHospital(hosp);
      });

      marker.bindPopup(`
        <div class="p-1 font-sans">
          <h4 class="font-bold text-slate-800 text-sm">${hosp.name}</h4>
          <p class="text-xs text-slate-600 mt-0.5">${hosp.address}</p>
          <div class="mt-2 flex items-center justify-between text-xs">
            <span class="font-medium text-slate-700">Status:</span>
            <span class="font-semibold capitalize text-teal-600">${crowd} Crowd</span>
          </div>
          <div class="mt-2 text-xs text-slate-500">
            Emergency: ${hosp.emergency_number || hosp.contact_number}
          </div>
        </div>
      `);

      marker.addTo(layerGroup);
    });

    // Auto-center on selected hospital
    if (selectedHospitalId) {
      const selected = hospitals.find((h) => h.id === selectedHospitalId);
      if (selected) {
        map.panTo([selected.latitude, selected.longitude], { animate: true, duration: 0.8 });
      }
    }
  }, [hospitals, userLocation, selectedHospitalId, hospitalCrowdLevels, onSelectHospital]);

  return (
    <div className="relative w-full h-[400px] lg:h-[480px] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full" />
      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200 shadow-sm text-xs flex flex-wrap items-center gap-3">
        <span className="font-semibold text-slate-700">Crowd Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-slate-600">Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="text-slate-600">Moderate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span className="text-slate-600">High</span>
        </div>
      </div>
    </div>
  );
};
