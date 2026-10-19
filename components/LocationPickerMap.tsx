import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const createChurchIcon = (logoUrl?: string | null) => L.divIcon({
  className: 'custom-leaflet-icon',
  html: `
    <div style="width: 40px; height: 40px; border-radius: 50%; border: 3px solid #E8C24D; background-color: #0B2E6B; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); position: relative; z-index: 1000;">
      <div style="width: 100%; height: 100%; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: white;">
        ${logoUrl 
          ? `<img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` 
          : `<span style="font-size: 20px;">⛪</span>`}
      </div>
      <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #E8C24D;"></div>
    </div>
  `,
  iconSize: [40, 48],
  iconAnchor: [20, 48],
});

const createUserIcon = (photoUrl?: string | null) => L.divIcon({
  className: 'custom-leaflet-icon',
  html: `
    <div style="width: 40px; height: 40px; border-radius: 50%; border: 3px solid #10b981; background-color: #0f172a; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); position: relative; z-index: 1001;">
      <div style="width: 100%; height: 100%; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #1e293b;">
        ${photoUrl 
          ? `<img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` 
          : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`}
      </div>
      <div style="position: absolute; top: -4px; right: -4px; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; display: inline-flex; height: 100%; width: 100%; border-radius: 50%; background-color: #10b981; opacity: 0.75;" class="animate-ping"></span>
        <span style="position: relative; display: inline-flex; border-radius: 50%; height: 10px; width: 10px; background-color: #10b981; border: 2px solid white;"></span>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function MapEvents({ setPosition }: { setPosition: (pos: { lat: number, lng: number }) => void }) {
  useMapEvents({
    click(e: any) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

export default function LocationPickerMap({ 
  position, 
  userPosition,
  setPosition, 
  mapCenter,
  churchLogoUrl,
  userPhotoUrl
}: { 
  position: { lat: number, lng: number }, 
  userPosition?: { lat: number, lng: number } | null,
  setPosition: (pos: { lat: number, lng: number }) => void, 
  mapCenter: [number, number],
  churchLogoUrl?: string | null,
  userPhotoUrl?: string | null
}) {
  return (
    <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={mapCenter} />
      <MapEvents setPosition={setPosition} />
      
      {/* Marqueur de l'église (déplaçable via clic) */}
      <Marker position={[position.lat, position.lng]} icon={createChurchIcon(churchLogoUrl)} />
      
      {/* Marqueur de l'utilisateur (temps réel, point clignotant) */}
      {userPosition && (
        <Marker position={[userPosition.lat, userPosition.lng]} icon={createUserIcon(userPhotoUrl)} />
      )}
    </MapContainer>
  );
}
