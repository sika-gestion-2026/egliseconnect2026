'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import Link from 'next/link';
import L from 'leaflet';
import 'leaflet.heat';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import RoutingMachine from '@/components/RoutingMachine';
import { updateMemberLocation } from '@/app/actions/localisationActions';

// --- Utilitaires géographiques ---
function getBearing(startLat: number, startLng: number, destLat: number, destLng: number) {
  const startLatRad = startLat * Math.PI / 180;
  const startLngRad = startLng * Math.PI / 180;
  const destLatRad = destLat * Math.PI / 180;
  const destLngRad = destLng * Math.PI / 180;
  
  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) - Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  
  const bearingRad = Math.atan2(y, x);
  return (bearingRad * 180 / Math.PI + 360) % 360;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}

// --- Icônes ---
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

const createUserIcon = (photoUrl?: string | null) => L.divIcon({
  className: 'custom-leaflet-icon',
  html: `
    <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; z-index: 1001;">
      <span style="position: absolute; display: inline-flex; height: 100%; width: 100%; border-radius: 50%; background-color: #3b82f6; opacity: 0.5;" class="animate-ping"></span>
      <div style="position: relative; border-radius: 50%; height: 44px; width: 44px; background-color: #2563eb; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.3); overflow: hidden; display: flex; align-items: center; justify-content: center;">
        ${photoUrl ? `<img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<span style="color: white; font-size: 20px;">👤</span>`}
      </div>
      <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid white;"></div>
    </div>
  `,
  iconSize: [44, 52],
  iconAnchor: [22, 52],
});

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

function MapControls({ userLocation, churchLocation }: { userLocation: { lat: number; lng: number } | null, churchLocation: any }) {
  const map = useMap();

  useEffect(() => {
    if (userLocation && churchLocation) {
      try {
        const bounds = L.latLngBounds([
          [userLocation.lat, userLocation.lng],
          [churchLocation.latitude, churchLocation.longitude]
        ]);
        map.fitBounds(bounds, { padding: [100, 100], animate: true });
      } catch (e) {}
    }
  }, [userLocation, churchLocation, map]);

  return (
    <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-3">
      <button onClick={() => map.zoomIn()} className="w-12 h-12 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-full shadow-2xl flex items-center justify-center text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-transform hover:scale-110">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>
      <button onClick={() => map.zoomOut()} className="w-12 h-12 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-full shadow-2xl flex items-center justify-center text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-transform hover:scale-110">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>
    </div>
  );
}

// Composant pour afficher la carte de chaleur
function HeatmapLayer({ points, show }: { points: [number, number, number][], show: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!show || points.length === 0) return;
    try {
      // @ts-ignore
      const heat = L.heatLayer(points, {
        radius: 35,
        blur: 25,
        maxZoom: 15,
        gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}
      }).addTo(map);
      return () => { map.removeLayer(heat); };
    } catch(e) { console.error(e); }
  }, [map, points, show]);
  return null;
}

export default function GlobalMapComponent({ 
  churches, userChurchId, userPhotoUrl, userName, userMemberId, otherMembers = []
}: { 
  churches: any[]; userChurchId: string | null; userPhotoUrl?: string | null; userName?: string | null; userMemberId?: string | null; otherMembers?: any[];
}) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [targetChurch, setTargetChurch] = useState<{ lat: number; lng: number } | null>(null);
  const [targetMember, setTargetMember] = useState<any | null>(null); // Pour la boussole membre
  const [routeInfo, setRouteInfo] = useState<{ distance: string; time: string; rawDistance: number; rawTime: number } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const lastLocationUpdate = useRef<number>(0);
  
  const [travelMode, setTravelMode] = useState<'car'|'foot'>('car');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'church'|'me'>('church');

  const defaultCenter = [churches[0]?.latitude || -4.4419, churches[0]?.longitude || 15.2663];
  const myChurch = churches.find(c => c.id === userChurchId);
  const center = myChurch ? [myChurch.latitude, myChurch.longitude] : defaultCenter;

  const churchBearing = useMemo(() => {
    if (userLocation && targetChurch) {
      return getBearing(userLocation.lat, userLocation.lng, targetChurch.lat, targetChurch.lng);
    }
    return null;
  }, [userLocation, targetChurch]);

  const memberBearing = useMemo(() => {
    if (userLocation && targetMember) {
      return getBearing(userLocation.lat, userLocation.lng, targetMember.latitude, targetMember.longitude);
    }
    return null;
  }, [userLocation, targetMember]);

  const membersSortedByProximityToChurch = useMemo(() => {
    if (!myChurch) return [];
    return [...otherMembers].map(m => ({
      ...m,
      distance: getDistance(m.latitude, m.longitude, myChurch.latitude, myChurch.longitude)
    })).sort((a, b) => a.distance - b.distance);
  }, [otherMembers, myChurch]);

  const membersSortedByProximityToMe = useMemo(() => {
    if (!userLocation) return [];
    return [...otherMembers].map(m => ({
      ...m,
      distance: getDistance(m.latitude, m.longitude, userLocation.lat, userLocation.lng)
    })).sort((a, b) => a.distance - b.distance);
  }, [otherMembers, userLocation]);

  const heatmapPoints = useMemo(() => {
    return otherMembers.map(m => [m.latitude, m.longitude, 1] as [number, number, number]);
  }, [otherMembers]);

  const membersOnRoute = useMemo(() => {
    if (!targetChurch || !userLocation) return [];
    return membersSortedByProximityToMe.filter(m => m.distance <= 3);
  }, [membersSortedByProximityToMe, targetChurch, userLocation]);

  const displayTime = useMemo(() => {
    if (!routeInfo) return null;
    if (travelMode === 'car') return routeInfo.time;
    const totalMinutes = Math.round((routeInfo.rawDistance / 1000) * 12);
    const timeHours = Math.floor(totalMinutes / 60);
    const timeMins = totalMinutes % 60;
    let str = '';
    if (timeHours > 0) str += `${timeHours}h `;
    str += `${timeMins} min`;
    return str;
  }, [routeInfo, travelMode]);

  const handleGoThere = (church: any) => {
    if ('geolocation' in navigator) {
      setGpsError(null);
      if (!watchId) toggleLiveTracking();
      setTargetChurch({ lat: church.latitude, lng: church.longitude });
    } else {
      setGpsError("La géolocalisation n'est pas supportée.");
    }
  };

  const handleTrackMember = (member: any) => {
    if ('geolocation' in navigator) {
      setGpsError(null);
      if (!watchId) toggleLiveTracking();
      setTargetMember(member);
    }
  };

  const handlePingMember = (member: any) => {
    alert(`👋 Un ping a été envoyé à ${member.first_name} ! Il recevra une notification dès sa prochaine connexion.`);
  };

  const toggleLiveTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setUserLocation(null);
      setTargetChurch(null);
      setTargetMember(null);
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
            
            const now = Date.now();
            if (userMemberId && now - lastLocationUpdate.current > 30000) {
              lastLocationUpdate.current = now;
              updateMemberLocation(userMemberId, newLat, newLng).catch(console.error);
            }
          },
          (err) => {
            console.error('GPS Error:', err);
            if (err.code === 1) setGpsError('Permission GPS refusée.');
            else if (err.code === 2) setGpsError('Position GPS introuvable.');
            else setGpsError('Erreur GPS. Réessayez.');
            setWatchId(null);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
        setWatchId(id);
      }
    }
  };

  useEffect(() => {
    if ('geolocation' in navigator && !watchId) {
      toggleLiveTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof window === 'undefined') return null;

  const currentLeaderboard = leaderboardTab === 'church' ? membersSortedByProximityToChurch : membersSortedByProximityToMe;

  return (
    <div className="w-full flex flex-col gap-4 h-full relative">
      {gpsError && (
        <div className="absolute top-4 left-4 z-[1000] bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg">
          <span>⚠️</span> {gpsError}
          <button onClick={() => setGpsError(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

      {/* Leaderboard & Heatmap Toggles */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <button onClick={() => setShowLeaderboard(!showLeaderboard)} className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-white flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Radar Membres ({otherMembers.length})
        </button>

        <button onClick={() => setShowHeatmap(!showHeatmap)} className={`px-4 py-2 rounded-2xl font-bold shadow-lg flex items-center gap-2 transition-all border backdrop-blur-md ${showHeatmap ? 'bg-orange-500 text-white border-orange-400' : 'bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
          🔥 {showHeatmap ? 'Masquer' : 'Afficher'} Densité
        </button>
      </div>

      {(routeInfo && targetChurch) && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl px-5 py-4 rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50 flex flex-col items-center animate-in slide-in-from-top-4 min-w-[320px]">
          {membersOnRoute.length > 0 && (
            <div className="w-full mb-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              <span className="text-xs font-bold text-blue-800 dark:text-blue-300">
                {membersOnRoute.length} membre{membersOnRoute.length > 1 ? 's' : ''} près de vous ({(membersOnRoute[0].distance).toFixed(1)}km)
              </span>
              <div className="ml-auto flex -space-x-2">
                {membersOnRoute.slice(0, 3).map(m => (
                  <div key={m.id} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 overflow-hidden bg-slate-200">
                    {m.photo_url ? <img src={m.photo_url} className="w-full h-full object-cover"/> : <span className="text-[10px] w-full h-full flex items-center justify-center">👤</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-3 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl w-full">
            <button onClick={() => setTravelMode('car')} className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${travelMode === 'car' ? 'bg-white dark:bg-slate-800 shadow text-primary-600' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>🚗 Voiture</button>
            <button onClick={() => setTravelMode('foot')} className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${travelMode === 'foot' ? 'bg-white dark:bg-slate-800 shadow text-primary-600' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>🚶‍♂️ À pied</button>
          </div>
          <div className="flex w-full justify-around items-center">
             <div className="text-center">
               <div className="text-2xl font-black text-primary-900 dark:text-gold-400">{displayTime}</div>
               <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-bold">Temps est.</div>
             </div>
             <div className="h-10 w-px bg-gray-200 dark:bg-slate-600"></div>
             <div className="text-center">
               <div className="text-xl font-bold text-gray-700 dark:text-gray-200">{routeInfo.distance}</div>
               <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-bold">Distance</div>
             </div>
          </div>
          <button onClick={() => { setTargetChurch(null); setRouteInfo(null); }} className="mt-4 w-full text-center bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 py-2 rounded-lg text-red-500 dark:text-red-400 text-xs font-bold uppercase tracking-wider transition-colors border border-red-100 dark:border-red-800/50">✖ Quitter l'itinéraire</button>
        </div>
      )}

      {/* Live Tracking Status Button */}
      <div className="absolute top-4 right-4 z-[1000]">
        <button 
          onClick={toggleLiveTracking}
          className={`px-4 py-3 rounded-2xl font-bold shadow-xl flex items-center gap-2 transition-all duration-300 border backdrop-blur-xl ${
            watchId 
              ? 'bg-green-600/90 hover:bg-green-600 text-white border-green-500/50 shadow-green-500/20' 
              : 'bg-white/90 hover:bg-white text-slate-800 border-white/40 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-white dark:border-slate-600/50'
          }`}
        >
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${watchId ? 'bg-white' : 'bg-green-500'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${watchId ? 'bg-white' : 'bg-green-500'}`}></span>
          </span>
          <span className="text-sm uppercase tracking-wider hidden md:inline">{watchId ? 'Live Actif' : 'Activer Live'}</span>
        </button>
      </div>

      {/* Compass Overlays */}
      <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-4">
        {churchBearing !== null && (
          <div className="w-24 h-24 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full shadow-2xl border-4 border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center relative">
            <div className="absolute inset-2 rounded-full flex items-center justify-center transition-transform duration-500 ease-out" style={{ transform: `rotate(${churchBearing}deg)` }}>
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[24px] border-b-primary-600 drop-shadow-md"></div>
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-2 h-10 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-slate-800 dark:bg-white rounded-full z-10 border-2 border-white dark:border-slate-800"></div>
            </div>
            <span className="absolute -top-6 text-[10px] font-black uppercase text-primary-700 dark:text-primary-400 bg-white/90 dark:bg-slate-800/90 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm border border-slate-200 dark:border-slate-700">Église</span>
          </div>
        )}

        {memberBearing !== null && targetMember && (
          <div className="w-20 h-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full shadow-2xl border-4 border-blue-100 dark:border-blue-900 flex flex-col items-center justify-center relative">
            <div className="absolute inset-2 rounded-full flex items-center justify-center transition-transform duration-500 ease-out" style={{ transform: `rotate(${memberBearing}deg)` }}>
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[20px] border-b-blue-500 drop-shadow-md"></div>
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-1.5 h-8 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-800 dark:bg-white rounded-full z-10 border-2 border-white dark:border-slate-800"></div>
            </div>
            <span className="absolute -top-6 text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 bg-white/90 dark:bg-slate-800/90 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm border border-slate-200 dark:border-slate-700 truncate max-w-[100px]">{targetMember.first_name}</span>
            <button onClick={() => setTargetMember(null)} className="absolute -right-2 -top-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-600">✕</button>
          </div>
        )}
      </div>

      {showLeaderboard && (
        <div className="absolute top-24 left-4 bottom-6 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl z-[2000] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700/50 flex flex-col overflow-hidden animate-in slide-in-from-left-8">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-600"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Radar Membres
            </h3>
            <button onClick={() => setShowLeaderboard(false)} className="text-slate-400 hover:text-slate-600 bg-slate-200 dark:bg-slate-700 p-1.5 rounded-full transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 m-3 rounded-xl">
            <button onClick={() => setLeaderboardTab('church')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${leaderboardTab === 'church' ? 'bg-white dark:bg-slate-700 shadow text-primary-600' : 'text-slate-500'}`}>⛪ Près de l'Église</button>
            <button onClick={() => setLeaderboardTab('me')} disabled={!userLocation} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${leaderboardTab === 'me' ? 'bg-white dark:bg-slate-700 shadow text-primary-600' : 'text-slate-500'} ${!userLocation && 'opacity-50 cursor-not-allowed'}`}>🚶 Près de Moi</button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {currentLeaderboard.length === 0 ? (
              <p className="text-sm text-center text-slate-500 mt-10 p-4">Aucun membre localisé actuellement. Activez le Live pour que les autres vous voient !</p>
            ) : (
              currentLeaderboard.map((member, i) => (
                <div key={member.id} className="flex flex-col p-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-2xl transition-colors border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 border-2 border-white dark:border-slate-800 shadow-sm relative">
                      {member.photo_url ? <img src={member.photo_url} className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-xl">👤</span>}
                      {i === 0 && <span className="absolute -top-1 -right-1 text-sm" title="Le plus proche">👑</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{member.first_name} {member.last_name}</p>
                      <p className="text-[10px] text-primary-600 dark:text-primary-400 font-bold uppercase tracking-wider">{member.role || 'Membre'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                        {member.distance < 1 ? `${Math.round(member.distance * 1000)}m` : `${member.distance.toFixed(1)}km`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                     <button onClick={() => handleTrackMember(member)} className="flex-1 text-[10px] uppercase font-bold tracking-wider py-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition-colors">📍 Cibler</button>
                     <button onClick={() => handlePingMember(member)} className="flex-1 text-[10px] uppercase font-bold tracking-wider py-1.5 rounded bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-100 transition-colors">👋 Ping</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Map Content */}
      <div className="h-full w-full relative z-0 rounded-2xl overflow-hidden shadow-inner">
        <MapContainer center={center as [number, number]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapControls userLocation={userLocation} churchLocation={myChurch} />
          <HeatmapLayer points={heatmapPoints} show={showHeatmap} />

          {/* Other Members Markers */}
          {otherMembers.map((member) => (
            <Marker key={member.id} position={[member.latitude, member.longitude]} icon={createOtherMemberIcon(member.photo_url)}>
              <Popup>
                <div className="flex flex-col gap-2 p-1 min-w-[180px] text-center">
                  {member.photo_url ? (
                    <img src={member.photo_url} className="w-12 h-12 rounded-full border-2 border-blue-500 object-cover mx-auto shadow-md" />
                  ) : (
                    <div className="w-12 h-12 rounded-full border-2 border-blue-500 bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl mx-auto shadow-md">👤</div>
                  )}
                  <div>
                    <h3 className="font-bold text-gray-900 m-0 leading-tight">{member.first_name} {member.last_name}</h3>
                    <p className="text-[10px] uppercase tracking-wider text-blue-600 font-bold m-0">{member.role || 'Membre'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 border-t pt-2 border-gray-100">
                    <button onClick={() => handleTrackMember(member)} className="text-[10px] font-bold bg-blue-50 text-blue-600 py-1.5 rounded hover:bg-blue-100">🎯 CIBLER</button>
                    <button onClick={() => handlePingMember(member)} className="text-[10px] font-bold bg-orange-50 text-orange-600 py-1.5 rounded hover:bg-orange-100">👋 PING</button>
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
                  <div className="flex items-center gap-3 border-b pb-3">
                    {church.logo_url ? <img src={church.logo_url} className="w-12 h-12 rounded-full border border-gray-200 object-cover shadow-sm" /> : <div className="text-3xl">⛪</div>}
                    <div>
                      <h3 className="font-black text-gray-900 m-0 leading-tight">{church.name}</h3>
                      <p className="text-[10px] uppercase tracking-widest text-primary-600 font-bold m-0 mt-1">🔴 Culte en cours</p>
                    </div>
                  </div>
                  <button onClick={() => handleGoThere(church)} className="bg-primary-600 hover:bg-primary-700 text-white w-full py-2.5 rounded-lg text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                    M'y rendre
                  </button>
                  {church.id === userChurchId ? (
                    <Link href="/dashboard" className="bg-green-600 hover:bg-green-500 text-white text-center w-full py-2.5 rounded-lg text-sm font-bold transition-all shadow-md">Accéder à mon église</Link>
                  ) : (
                    <div className="text-center text-xs text-gray-500 bg-gray-50 border rounded-lg py-2 flex items-center justify-center gap-1.5 font-bold">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                       Espace réservé
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {targetChurch && userLocation && (
            <RoutingMachine userLocation={userLocation} churchLocation={targetChurch} onRouteFound={setRouteInfo} />
          )}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon(userPhotoUrl)}>
              <Popup>
                <div className="text-center min-w-[130px] p-1">
                   <div className="font-black text-gray-900 text-sm">{userName || 'Moi'}</div>
                   <div className="text-[10px] uppercase text-blue-600 font-bold mt-2 flex items-center justify-center gap-1.5 bg-blue-50 py-1 px-2 rounded-md">
                     <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                     </span>
                     Ma Position Live
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
