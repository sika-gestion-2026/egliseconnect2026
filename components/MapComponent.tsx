'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

import L from 'leaflet';

const customIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// We need a hook to use the map instance for routing
const RoutingMachine = dynamic<{ userLocation: { lat: number; lng: number }; churchLocation: { lat: number; lng: number } }>(
  () => import('@/components/RoutingMachine'),
  { ssr: false }
);

interface MapComponentProps {
  churchLocation: { lat: number; lng: number };
  churchName: string;
}

export default function MapComponent({ churchLocation, churchName }: MapComponentProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleGoThere = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Erreur de géolocalisation: ", error);
          alert("Impossible d'obtenir votre position. Vérifiez vos paramètres.");
        }
      );
    } else {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
    }
  };

  // Only render on client side when window is available
  if (typeof window === 'undefined') return null;

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-800">{churchName}</h3>
        {!userLocation && (
          <button 
            onClick={handleGoThere}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <span>📍</span> M'y rendre
          </button>
        )}
      </div>
      <div className="h-[500px] w-full rounded-xl overflow-hidden shadow-lg border border-gray-200 relative z-0">
        <MapContainer center={[churchLocation.lat, churchLocation.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {userLocation ? (
            <RoutingMachine userLocation={userLocation} churchLocation={churchLocation} />
          ) : (
            <Marker position={[churchLocation.lat, churchLocation.lng]} icon={customIcon}>
              <Popup>
                <strong>{churchName}</strong><br />
                Lieu de culte principal. Cliquez sur "M'y rendre" pour l'itinéraire.
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
