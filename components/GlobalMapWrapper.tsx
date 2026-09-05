'use client';

import dynamic from 'next/dynamic';

const GlobalMapComponent = dynamic(() => import('@/components/GlobalMapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center animate-pulse border border-slate-200 dark:border-slate-700 shadow-inner">
      <div className="text-4xl mb-4">🌍</div>
      <span className="text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase text-sm">Chargement du radar GPS...</span>
    </div>
  )
});

export default function GlobalMapWrapper(props: any) {
  return <GlobalMapComponent {...props} />;
}
