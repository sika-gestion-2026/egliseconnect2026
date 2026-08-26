'use client';

import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import Link from 'next/link';

import L from 'leaflet';

const createChurchIcon = (logoUrl?: string | null, isMine?: boolean) => L.divIcon({
  className: 'custom-leaflet-icon',
  html: `
    <div style="width: 40px; height: 40px; border-radius: 50%; border: 3px solid ${isMine ? '#10b981' : '#E8C24D'}; background-color: #0B2E6B; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); position: relative; z-index: ${isMine ? '1000' : '900'};">
      <div style="width: 100%; height: 100%; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: white;">
        ${logoUrl 
          ? `<img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` 
          : `<span style="font-size: 20px;">⛪</span>`}
      </div>
      <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${isMine ? '#10b981' : '#E8C24D'};"></div>
      ${isMine ? `<div style="position: absolute; top: -4px; right: -4px; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center;"><span style="position: absolute; display: inline-flex; height: 100%; width: 100%; border-radius: 50%; background-color: #10b981; opacity: 0.75;" class="animate-ping"></span><span style="position: relative; display: inline-flex; border-radius: 50%; height: 10px; width: 10px; background-color: #10b981; border: 2px solid white;"></span></div>` : ''}
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

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import RoutingMachine from '@/components/RoutingMachine';

export default function GlobalMapComponent({ 
  churches, 
  userChurchId, 
  userPhotoUrl,
  userName
}: { 
  churches: any[]; 
  userChurchId: string | null;
  userPhotoUrl?: string | null;
  userName?: string | null;
}) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [targetChurch, setTargetChurch] = useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; time: string } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  const defaultCenter = [churches[0]?.latitude || -4.4419, churches[0]?.longitude || 15.2663];
  
  // Find my church
  const myChurch = churches.find(c => c.id === userChurchId);
  const center = myChurch ? [myChurch.latitude, myChurch.longitude] : defaultCenter;

  const handleGoThere = (church: any) => {
    if ('geolocation' in navigator) {
      if (!watchId) toggleLiveTracking(); // Automatically enable live tracking
      setTargetChurch({ lat: church.latitude, lng: church.longitude });
    } else {
      alert("Géolocalisation non supportée.");
    }
  };

  const toggleLiveTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setUserLocation(null);
      setTargetChurch(null);
      setRouteInfo(null);
    } else {
      if ('geolocation' in navigator) {
        const id = navigator.geolocation.watchPosition(
          (position) => {
            setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          },
          (err) => console.error(err),
          { enableHighAccuracy: true }
        );
        setWatchId(id);
      }
    }
  };

  if (typeof window === 'undefined') return null;

  return (
    <div className="w-full flex flex-col gap-4 h-full relative">
      {/* Route Info Overlay */}
      {(routeInfo && targetChurch) && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 flex flex-col items-center animate-in slide-in-from-top-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-2">Trajet le plus court</div>
          <div className="flex gap-6 items-center">
             <div className="text-center">
               <div className="text-2xl font-black text-primary-900 dark:text-gold-400">{routeInfo.time}</div>
               <div className="text-xs text-gray-500 dark:text-gray-400">Temps estimé</div>
             </div>
             <div className="h-8 w-px bg-gray-200 dark:bg-slate-600"></div>
             <div className="text-center">
               <div className="text-xl font-bold text-gray-700 dark:text-gray-200">{routeInfo.distance}</div>
               <div className="text-xs text-gray-500 dark:text-gray-400">Distance</div>
             </div>
          </div>
        </div>
      )}

      {/* Cancel Itinerary Button */}
      {(targetChurch && userLocation) && (
         <button onClick={() => { setTargetChurch(null); setRouteInfo(null); }} className="absolute top-4 right-4 z-[9999] bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg font-bold shadow-md hover:bg-red-50 dark:hover:bg-red-900/20 border dark:border-red-900/50 transition-colors">
           ✖ Annuler
         </button>
      )}

      {/* Live Tracking Toggle Button */}
      <button 
        onClick={toggleLiveTracking}
        className={`absolute bottom-6 left-6 z-[1000] px-5 py-3 rounded-full font-bold shadow-xl flex items-center gap-3 transition-all duration-300 border ${
          watchId 
            ? 'bg-green-600 hover:bg-green-700 text-white border-green-500' 
            : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-600'
        }`}
      >
        <span className="relative flex h-3 w-3">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${watchId ? 'bg-white' : 'bg-green-500'} opacity-75`}></span>
          <span className={`relative inline-flex rounded-full h-3 w-3 ${watchId ? 'bg-white' : 'bg-green-500'}`}></span>
        </span>
        {watchId ? 'Suivi Live Actif' : 'Position en direct'}
      </button>

      <div className="h-[600px] w-full rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-200 dark:border-slate-700 relative z-0">
        <MapContainer center={center as [number, number]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {targetChurch && userLocation ? (
             <RoutingMachine userLocation={userLocation} churchLocation={targetChurch} onRouteFound={setRouteInfo} />
          ) : (
            churches.map((church) => (
              <Marker key={church.id} position={[church.latitude, church.longitude]} icon={createChurchIcon(church.logo_url, church.id === userChurchId)}>
                <Popup>
                  <div className="flex flex-col gap-3 p-1 min-w-[220px]">
                    <div className="flex items-center gap-3 border-b pb-2">
                      {church.logo_url ? <img src={church.logo_url} className="w-10 h-10 rounded-full border border-gray-200 object-cover" /> : <div className="text-2xl">⛪</div>}
                      <div>
                        <h3 className="font-bold text-gray-900 m-0 leading-tight">{church.name}</h3>
                        <p className="text-xs text-gray-500 m-0">{church.city} {church.commune}</p>
                      </div>
                    </div>
                    <button onClick={() => handleGoThere(church)} className="bg-primary-900 hover:bg-primary-800 text-white w-full py-2 rounded-md text-sm font-medium transition-colors">📍 M'y rendre</button>
                    {church.id === userChurchId ? (
                      <Link href="/dashboard" className="bg-green-600 hover:bg-green-500 text-white text-center w-full py-2 rounded-md text-sm font-medium transition-colors">Accéder à mon église</Link>
                    ) : (
                      <div className="text-center text-xs text-gray-400 bg-gray-50 border rounded-md py-1.5 flex items-center justify-center gap-1">
                         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                         Espace membre
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))
          )}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon(userPhotoUrl)}>
              <Popup>
                <div className="text-center min-w-[120px] p-1">
                   <div className="font-bold text-gray-900 text-sm">{userName || 'Moi'}</div>
                   <div className="text-xs text-green-600 font-bold mt-1.5 flex items-center justify-center gap-1.5">
                     <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                     </span>
                     Position actuelle
                   </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
