'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { updateMemberProfile } from '@/app/actions/updateMemberProfile';

export default function ProfileForm({ member }: { member: any }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const res = await updateMemberProfile(formData);
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Profil mis à jour avec succès !');
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Prénom */}
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Prénom *</label>
          <input 
            type="text" 
            name="first_name" 
            defaultValue={member.first_name} 
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
          />
        </div>

        {/* Nom */}
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
          <input 
            type="text" 
            name="last_name" 
            defaultValue={member.last_name} 
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
          />
        </div>

        {/* Téléphone */}
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
          <input 
            type="tel" 
            name="phone" 
            defaultValue={member.phone || ''} 
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input 
            type="email" 
            name="email" 
            defaultValue={member.email || ''} 
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
          />
        </div>

        {/* Date de Naissance */}
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Date de Naissance</label>
          <input 
            type="date" 
            name="birth_date" 
            defaultValue={member.birth_date || ''} 
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
          />
        </div>

        {/* Profession */}
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Profession</label>
          <input 
            type="text" 
            name="profession" 
            defaultValue={member.profession || ''} 
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
          />
        </div>

        {/* Commune */}
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Commune</label>
          <input 
            type="text" 
            name="commune" 
            defaultValue={member.commune || ''} 
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
          />
        </div>

        {/* Quartier */}
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Quartier</label>
          <input 
            type="text" 
            name="quartier" 
            defaultValue={member.quartier || ''} 
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
          />
        </div>
        
        {/* Photo URL */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Photo de profil</label>
          <div className="flex items-center gap-4">
            {member.photo_url ? (
              <img src={member.photo_url} alt="Profil" className="w-16 h-16 rounded-full object-cover border-2 border-gold-500" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-gray-500 text-xl font-bold border-2 border-dashed border-gray-300">
                {member.first_name?.[0]}
              </div>
            )}
            <input 
              type="file" 
              name="photo_file"
              accept="image/*"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-900 hover:file:bg-primary-100 dark:file:bg-primary-900/30 dark:file:text-primary-100"
            />
            <input type="hidden" name="existing_photo_url" value={member.photo_url || ''} />
          </div>
          <p className="text-xs text-gray-500 mt-2">Sélectionnez une image pour mettre à jour votre photo. Laissez vide pour conserver l'actuelle.</p>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t dark:border-slate-700">
        <button 
          type="submit" 
          disabled={loading}
          className="bg-primary-900 hover:bg-primary-800 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:scale-100 active:scale-95 flex items-center gap-2"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer mes informations'}
        </button>
      </div>

    </form>
  );
}
