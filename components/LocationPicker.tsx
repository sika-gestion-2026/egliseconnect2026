'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { ssr: false });

export default function LocationPicker() {
  // Default to Kinshasa for example
  const [position, setPosition] = useState<{ lat: number, lng: number }>({ lat: -4.4419, lng: 15.2663 });
  const [isClient, setIsClient] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-4.4419, 15.2663]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleGetCurrentLocation = () => {
    setStatus('loading');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setMapCenter([pos.coords.latitude, pos.coords.longitude]);
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
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Vous n'avez pas besoin de connaître la longitude ou la latitude. Cliquez simplement sur ce bouton pour capturer la position exacte où vous vous trouvez :
        </p>
        <button 
          type="button" 
          onClick={handleGetCurrentLocation}
          disabled={status === 'loading'}
          className={`w-full text-white px-6 py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg ring-4 ${
            status === 'success' 
              ? 'bg-green-600 hover:bg-green-700 ring-green-100 dark:ring-green-900/30'
              : 'bg-red-600 hover:bg-red-700 ring-red-100 dark:ring-red-900/30'
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

      <div className="h-[250px] w-full rounded-xl overflow-hidden border border-gray-200 z-0 relative mt-2 opacity-80 pointer-events-none">
        {/* La carte est affichée juste pour confirmer visuellement, mais pas besoin de cliquer dessus */}
        <LocationPickerMap position={position} setPosition={setPosition} mapCenter={mapCenter} />
      </div>
    </div>
  );
}
