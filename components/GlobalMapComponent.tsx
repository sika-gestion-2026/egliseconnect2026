'use client';

import { useState } from 'react';

import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import Link from 'next/link';

import L from 'leaflet';

const createChurchIcon = (logoUrl?: string | null, isMine?: boolean) => L.divIcon({
  className: 'custom-leaflet-icon',
  html: `
    <div style="width: 50px; height: 50px; border-radius: 50%; border: 4px solid ${isMine ? '#10b981' : '#f59e0b'}; background-color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3); position: relative; z-index: ${isMine ? '1000' : '900'};">
      <div style="width: 100%; height: 100%; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f8fafc;">
        ${logoUrl 
          ? `<img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><span style="display: none; font-size: 24px;">⛪</span>` 
          : `<span style="font-size: 24px;">⛪</span>`}
      </div>
      <div style="position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 12px solid ${isMine ? '#10b981' : '#f59e0b'};"></div>
      ${isMine ? `<div style="position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;"><span style="position: absolute; display: inline-flex; height: 100%; width: 100%; border-radius: 50%; background-color: #10b981; opacity: 0.75;" class="animate-ping"></span><span style="position: relative; display: inline-flex; border-radius: 50%; height: 12px; width: 12px; background-color: #10b981; border: 2px solid white;"></span></div>` : ''}
    </div>
  `,
  iconSize: [50, 62],
  iconAnchor: [25, 62],
});

const createUserIcon = () => L.divIcon({
  className: 'custom-leaflet-icon',
  html: `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <span style="position: absolute; display: inline-flex; height: 100%; width: 100%; border-radius: 50%; background-color: #3b82f6; opacity: 0.5;" class="animate-ping"></span>
      <span style="position: relative; display: inline-flex; border-radius: 50%; height: 16px; width: 16px; background-color: #2563eb; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.3);"></span>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import RoutingMachine from '@/components/RoutingMachine';
import { useEffect } from 'react';

function MapControls({ 
  userLocation, 
  churchLocation 
}: { 
  userLocation: { lat: number; lng: number } | null, 
  churchLocation: any 
}) {
  const map = useMap();

  useEffect(() => {
    if (userLocation && churchLocation) {
      try {
        const bounds = L.latLngBounds([
          [userLocation.lat, userLocation.lng],
          [churchLocation.latitude, churchLocation.longitude]
        ]);
        map.fitBounds(bounds, { padding: [100, 100], animate: true });
      } catch (e) {
        console.error("Erreur de calcul des limites :", e);
      }
    }
  }, [userLocation, churchLocation, map]);

  return (
    <div className="absolute top-[200px] right-6 z-[1000] md:top-[180px] md:right-8 flex flex-col gap-3">
      <button onClick={() => map.zoomIn()} className="w-12 h-12 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-full shadow-2xl flex items-center justify-center text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-transform hover:scale-110">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>
      <button onClick={() => map.zoomOut()} className="w-12 h-12 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-full shadow-2xl flex items-center justify-center text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-transform hover:scale-110">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>
    </div>
  );
}

import { updateMemberLocation } from '@/app/actions/localisationActions';
import { useRef } from 'react';

const createOtherMemberIcon = (photoUrl?: string | null) => L.divIcon({
  className: 'custom-leaflet-icon',
  html: `
    <div style="width: 40px; height: 40px; border-radius: 50%; border: 3px solid #3b82f6; background-color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.2); position: relative; z-index: 950;">
      <div style="width: 100%; height: 100%; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #e2e8f0;">
        ${photoUrl 
          ? `<img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><span style="display: none; font-size: 20px;">👤</span>` 
          : `<span style="font-size: 20px;">👤</span>`}
      </div>
      <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #3b82f6;"></div>
    </div>
  `,
  iconSize: [40, 48],
  iconAnchor: [20, 48],
});

export default function GlobalMapComponent({ 
  churches, 
  userChurchId, 
  userPhotoUrl,
  userName,
  userMemberId,
  otherMembers = []
}: { 
  churches: any[]; 
  userChurchId: string | null;
  userPhotoUrl?: string | null;
  userName?: string | null;
  userMemberId?: string | null;
  otherMembers?: any[];
}) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [targetChurch, setTargetChurch] = useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; time: string } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const lastLocationUpdate = useRef<number>(0);

  const defaultCenter = [churches[0]?.latitude || -4.4419, churches[0]?.longitude || 15.2663];
  
  // Find my church
  const myChurch = churches.find(c => c.id === userChurchId);
  const center = myChurch ? [myChurch.latitude, myChurch.longitude] : defaultCenter;

  const handleGoThere = (church: any) => {
    if ('geolocation' in navigator) {
      setGpsError(null);
      if (!watchId) toggleLiveTracking();
      setTargetChurch({ lat: church.latitude, lng: church.longitude });
    } else {
      setGpsError("La géolocalisation n'est pas supportée par votre appareil.");
    }
  };

  const toggleLiveTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setUserLocation(null);
      setTargetChurch(null);
      setRouteInfo(null);
      setGpsError(null);
    } else {
      if ('geolocation' in navigator) {
        const id = navigator.geolocation.watchPosition(
          (position) => {
            setGpsError(null);
            const newLat = position.coords.latitude;
            const newLng = position.coords.longitude;
            setUserLocation({ lat: newLat, lng: newLng });
            
            // Push location to DB if we have a member ID, max once every 30 seconds
            const now = Date.now();
            if (userMemberId && now - lastLocationUpdate.current > 30000) {
              lastLocationUpdate.current = now;
              updateMemberLocation(userMemberId, newLat, newLng).catch(console.error);
            }
          },
          (err) => {
            console.error('GPS Error:', err);
            if (err.code === 1) {
              setGpsError('Permission GPS refusée. Veuillez l\'autoriser dans les paramètres de votre navigateur.');
            } else if (err.code === 2) {
              setGpsError('Position GPS introuvable. Vérifiez que le GPS est activé.');
            } else {
              setGpsError('Erreur GPS. Réessayez.');
            }
            setWatchId(null);
            setTargetChurch(null);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
        setWatchId(id);
      }
    }
  };

  useEffect(() => {
    // Démarrage automatique de la localisation au chargement
    if ('geolocation' in navigator && !watchId && !userLocation && !gpsError) {
      toggleLiveTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof window === 'undefined') return null;

  return (
    <div className="w-full flex flex-col gap-4 h-full relative">
      {/* GPS Error Banner */}
      {gpsError && (
        <div className="absolute top-4 left-4 z-[1000] bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
          <span>⚠️</span> {gpsError}
          <button onClick={() => setGpsError(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

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
      <div className="absolute top-[130px] right-6 z-[1000] md:top-[120px] md:right-8">
        <button 
          onClick={toggleLiveTracking}
          className={`px-5 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 transition-all duration-300 border backdrop-blur-xl ${
            watchId 
              ? 'bg-green-600/90 hover:bg-green-600 text-white border-green-500/50 shadow-green-500/20' 
              : 'bg-white/90 hover:bg-white text-slate-800 border-white/40 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-white dark:border-slate-600/50'
          }`}
        >
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${watchId ? 'bg-white' : 'bg-green-500'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${watchId ? 'bg-white' : 'bg-green-500'}`}></span>
          </span>
          <span className="text-sm uppercase tracking-wider">{watchId ? 'Suivi Live Actif' : 'Me Localiser'}</span>
        </button>
      </div>

      <div className="h-full w-full relative z-0">
        <MapContainer center={center as [number, number]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          <MapControls userLocation={userLocation} churchLocation={myChurch} />

          {/* Other Members Markers */}
          {otherMembers.map((member) => (
            <Marker key={member.id} position={[member.latitude, member.longitude]} icon={createOtherMemberIcon(member.photo_url)}>
              <Popup>
                <div className="flex flex-col gap-2 p-1 min-w-[150px] text-center">
                  {member.photo_url ? (
                    <img src={member.photo_url} className="w-12 h-12 rounded-full border-2 border-blue-500 object-cover mx-auto" />
                  ) : (
                    <div className="w-12 h-12 rounded-full border-2 border-blue-500 bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl mx-auto">👤</div>
                  )}
                  <div>
                    <h3 className="font-bold text-gray-900 m-0 leading-tight">{member.first_name} {member.last_name}</h3>
                    <p className="text-xs text-blue-600 font-medium m-0">{member.role || 'Membre'}</p>
                    <p className="text-xs text-gray-500 mt-1">À proximité</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Always show church markers */}
          {churches.map((church) => (
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
          ))}

          {/* Show routing only when both user position and target are known */}
          {targetChurch && userLocation && (
            <RoutingMachine userLocation={userLocation} churchLocation={targetChurch} onRouteFound={setRouteInfo} />
          )}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon()}>
              <Popup>
                <div className="text-center min-w-[120px] p-1">
                   <div className="font-bold text-gray-900 text-sm">{userName || 'Moi'}</div>
                   <div className="text-xs text-blue-600 font-bold mt-1.5 flex items-center justify-center gap-1.5">
                     <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                     </span>
                     Ma Position
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
