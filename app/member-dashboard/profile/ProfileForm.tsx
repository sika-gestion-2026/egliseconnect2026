'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { updateMemberProfile } from '@/app/actions/updateMemberProfile';
import ImageCropperModal from '@/components/ImageCropperModal';

export default function ProfileForm({ member }: { member: any }) {
  const [loading, setLoading] = useState(false);
  
  // States for Image Cropper
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setOriginalImageSrc(reader.result?.toString() || null);
        setShowCropper(true);
      });
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset input
    }
  };

  const handleCropComplete = (file: File, url: string) => {
    setPhotoFile(file);
    setPhotoPreviewUrl(url);
    setShowCropper(false);
    setOriginalImageSrc(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    
    // Inject the cropped file if it exists
    if (photoFile) {
      formData.set('photo_file', photoFile);
    }
    
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
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Photo de profil</label>
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 border border-gray-100 dark:border-slate-700 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50">
            <div className="relative">
              {photoPreviewUrl || member.photo_url ? (
                <img 
                  src={photoPreviewUrl || member.photo_url} 
                  alt="Profil" 
                  className="w-24 h-24 rounded-full object-cover object-top border-4 border-white dark:border-slate-700 shadow-lg" 
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900/30 border-4 border-white dark:border-slate-700 flex items-center justify-center text-primary-900 dark:text-gold-400 text-3xl font-bold shadow-lg">
                  {member.first_name?.[0]}
                </div>
              )}
              {photoPreviewUrl && (
                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" title="Nouvelle photo">
                  ✓
                </div>
              )}
            </div>
            
            <div className="flex-1 w-full flex flex-col gap-2">
              <label className="cursor-pointer bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600 px-6 py-3 rounded-xl shadow-sm text-sm font-bold text-gray-700 dark:text-white transition-all text-center flex items-center justify-center gap-2">
                <span>📷 Choisir une nouvelle photo</span>
                <input 
                  type="file" 
                  name="photo_file" // Form sera vide si on annule, mais overridé par photoFile au submit
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
                Vous pourrez zoomer et centrer votre visage avant l'envoi. Format carré recommandé.
              </p>
            </div>
            
            <input type="hidden" name="existing_photo_url" value={member.photo_url || ''} />
          </div>
        </div>
      </div>

      {showCropper && originalImageSrc && (
        <ImageCropperModal
          imageSrc={originalImageSrc}
          onClose={() => {
            setShowCropper(false);
            setOriginalImageSrc(null);
          }}
          onCropComplete={handleCropComplete}
        />
      )}

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
