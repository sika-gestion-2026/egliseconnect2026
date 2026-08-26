'use client';

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/utils/cropImage';

interface ImageCropperModalProps {
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedFile: File, croppedImageUrl: string) => void;
}

export default function ImageCropperModal({ imageSrc, onClose, onCropComplete }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleValidate = async () => {
    try {
      setIsProcessing(true);
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedFile) {
        const url = URL.createObjectURL(croppedFile);
        onCropComplete(croppedFile, url);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-700/50">
        <div className="p-5 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
          <h2 className="text-xl font-black text-gray-800 dark:text-white">Ajustez votre photo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 font-bold p-2 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">✕</button>
        </div>
        
        <div className="relative w-full h-[400px] bg-slate-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={handleCropComplete}
            onZoomChange={setZoom}
          />
        </div>
        
        <div className="p-6 flex flex-col gap-6 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-600/50">
            <span className="text-xl">🔍</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 px-4 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-white font-bold rounded-2xl transition-all active:scale-95 border border-gray-200 dark:border-slate-600 shadow-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleValidate}
              disabled={isProcessing}
              className="flex-1 py-3.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-primary-600/20"
            >
              {isProcessing ? 'Génération...' : 'Valider la photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
