'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Journaliser l'erreur pour le suivi (sans exposer le message à l'utilisateur)
    console.error('Erreur applicative:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gold-500/15 text-4xl">
        ⛪
      </div>
      <div>
        <h2 className="text-2xl font-bold font-serif text-primary-900 dark:text-gold-400">
          Oups ! Quelque chose s&apos;est mal passé.
        </h2>
        <p className="mt-3 max-w-md text-base text-slate-600 dark:text-slate-300">
          La page a rencontré une erreur inattendue. Vos données sont intactes.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="rounded-full bg-primary-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-xl"
        >
          Réessayer
        </button>
        <a
          href="/"
          className="rounded-full border border-primary-600 px-8 py-3 font-semibold text-primary-600 transition-all hover:-translate-y-0.5 hover:bg-primary-50"
        >
          Retour à l&apos;accueil
        </a>
      </div>
    </div>
  );
}
