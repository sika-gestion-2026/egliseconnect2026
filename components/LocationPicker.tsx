'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { ssr: false });

export default function LocationPicker({ 
  initialLat, 
  initialLng,
  churchLogoUrl,
  userPhotoUrl
}: { 
  initialLat?: number | null, 
  initialLng?: number | null,
  churchLogoUrl?: string | null,
  userPhotoUrl?: string | null
}) {
  // Default to Kinshasa for example
  const [position, setPosition] = useState<{ lat: number, lng: number }>({ lat: initialLat || -4.4419, lng: initialLng || 15.2663 });
  const [userPosition, setUserPosition] = useState<{ lat: number, lng: number } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([initialLat || -4.4419, initialLng || 15.2663]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(initialLat ? 'success' : 'idle');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleGetCurrentLocation = () => {
    setStatus('loading');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserPosition(coords);
          setPosition(coords);
          setMapCenter([coords.lat, coords.lng]);
          setStatus('success');
          alert("Position capturée avec succès ! ✅");
        },
        (err) => {
          console.error("Erreur géoloc", err);
          setStatus('error');
          if (err.code === 1) {
            alert("Erreur : Vous avez refusé l'accès à la position. Veuillez l'autoriser dans votre navigateur.");
          } else {
            alert("Erreur : Impossible de récupérer votre position GPS. Vérifiez que la localisation de votre appareil est activée.");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setStatus('error');
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
    }
  };

  if (!isClient) return <div className="h-[300px] bg-slate-100 rounded-md animate-pulse"></div>;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Hidden inputs to send to the server action */}
      <input type="hidden" name="latitude" value={position.lat} />
      <input type="hidden" name="longitude" value={position.lng} />

      <div className="flex flex-col gap-4 mb-2">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Vous pouvez <strong>cliquer sur la carte</strong> pour placer le pointeur exactement sur l'église, ou utiliser la détection automatique du GPS :
        </p>
        <button 
          type="button" 
          onClick={handleGetCurrentLocation}
          disabled={status === 'loading'}
          className={`w-full text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 ${
            status === 'success' 
              ? 'bg-gradient-to-r from-green-600 to-green-500 hover:shadow-green-500/25'
              : 'bg-gradient-to-r from-primary-900 to-primary-500 hover:shadow-primary-500/25'
          } ${status === 'loading' ? 'opacity-75 cursor-wait' : ''}`}
        >
          {status === 'loading' ? (
            <span>⏳ Recherche du signal GPS...</span>
          ) : status === 'success' ? (
            <span>✅ Position capturée ! (Cliquez pour refaire)</span>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12A10 10 0 0 0 12 2v10z"></path><path d="M12 22A10 10 0 1 1 22 12"></path><circle cx="12" cy="12" r="2"></circle></svg>
              Capturer ma position automatiquement
            </>
          )}
        </button>
      </div>

      <div className="h-[350px] w-full rounded-xl overflow-hidden border border-white/20 dark:border-slate-700 shadow-inner z-0 relative mt-4">
        {/* La carte est interactive, l'utilisateur peut cliquer pour déplacer le marqueur */}
        <LocationPickerMap 
          position={position} 
          userPosition={userPosition}
          setPosition={setPosition} 
          mapCenter={mapCenter} 
          churchLogoUrl={churchLogoUrl}
          userPhotoUrl={userPhotoUrl}
        />
      </div>
    </div>
  );
}
