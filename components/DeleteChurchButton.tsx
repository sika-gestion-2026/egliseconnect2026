'use client';

export default function DeleteChurchButton({ churchName }: { churchName: string }) {
  return (
    <button 
      type="submit" 
      onClick={(e) => {
        if (!confirm(`Êtes-vous absolument sûr de vouloir supprimer définitivement l'église "${churchName}" ? Cette action est irréversible.`)) {
          e.preventDefault();
        }
      }}
      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-bold transition-colors shadow-sm ring-4 ring-red-100 dark:ring-red-900/30"
    >
      Supprimer l'Église Définitivement
    </button>
  );
}
