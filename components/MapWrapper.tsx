'use client';

import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-100 rounded-xl flex items-center justify-center animate-pulse">
      <span className="text-gray-400 font-medium text-lg">Chargement de la carte...</span>
    </div>
  )
});

export default MapComponent;
