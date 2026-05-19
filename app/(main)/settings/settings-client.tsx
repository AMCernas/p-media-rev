'use client';

import { useState, useEffect, useCallback } from 'react';

interface SettingsClientProps {
  initialSettings: {
    profileName: string;
    preferredLanguage: string;
    librarySort: string;
  };
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const [profileName, setProfileName] = useState(initialSettings.profileName);
  const [preferredLanguage, setPreferredLanguage] = useState(initialSettings.preferredLanguage);
  const [librarySort, setLibrarySort] = useState(initialSettings.librarySort);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const changed = 
      profileName !== initialSettings.profileName ||
      preferredLanguage !== initialSettings.preferredLanguage ||
      librarySort !== initialSettings.librarySort;
    setHasChanges(changed);
  }, [profileName, preferredLanguage, librarySort, initialSettings]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileName: profileName || null,
          preferredLanguage,
          librarySort,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }
      
      setSaveMessage({ type: 'success', text: 'Configuración guardada correctamente' });
      setHasChanges(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error al guardar' });
    } finally {
      setIsSaving(false);
    }
  }, [profileName, preferredLanguage, librarySort]);

  return (
    <div className="space-y-6">
      {/* Profile Name */}
      <div className="space-y-2">
        <label htmlFor="profileName" className="block text-sm font-medium text-[#fafafa]">
          Nombre de perfil
        </label>
        <input
          id="profileName"
          type="text"
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          placeholder="Tu nombre personalizado"
          className="w-full px-4 py-3 bg-[#27272a] border border-[#3f3f46] rounded-lg text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] focus:border-transparent transition-colors"
        />
        <p className="text-xs text-[#71717a]">
          Este nombre aparecerá en el saludo del Dashboard
        </p>
      </div>

      {/* Preferred Language */}
      <div className="space-y-2">
        <label htmlFor="preferredLanguage" className="block text-sm font-medium text-[#fafafa]">
          Idioma preferido
        </label>
        <select
          id="preferredLanguage"
          value={preferredLanguage}
          onChange={(e) => setPreferredLanguage(e.target.value)}
          className="w-full px-4 py-3 bg-[#27272a] border border-[#3f3f46] rounded-lg text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] focus:border-transparent transition-colors appearance-none cursor-pointer"
        >
          <option value="es-ES">Español</option>
          <option value="en-US">English</option>
        </select>
        <p className="text-xs text-[#71717a]">
          Afecta los resultados de TMDB (películas y series populares, trending)
        </p>
      </div>

      {/* Library Sort */}
      <div className="space-y-2">
        <label htmlFor="librarySort" className="block text-sm font-medium text-[#fafafa]">
          Orden predeterminado de la biblioteca
        </label>
        <select
          id="librarySort"
          value={librarySort}
          onChange={(e) => setLibrarySort(e.target.value)}
          className="w-full px-4 py-3 bg-[#27272a] border border-[#3f3f46] rounded-lg text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] focus:border-transparent transition-colors appearance-none cursor-pointer"
        >
          <option value="updatedAt_desc">Más reciente primero</option>
          <option value="updatedAt_asc">Más antiguo primero</option>
          <option value="rating_desc">Mejor rating primero</option>
          <option value="title_asc">Orden alfabético (A-Z)</option>
        </select>
        <p className="text-xs text-[#71717a]">
          Orden por defecto al ver tu biblioteca
        </p>
      </div>

      {/* Save Button */}
      <div className="pt-4">
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            hasChanges && !isSaving
              ? 'bg-[#8b5cf6] text-white hover:bg-[#7c3aed] cursor-pointer'
              : 'bg-[#3f3f46] text-[#a1a1aa] cursor-not-allowed'
          }`}
        >
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        
        {saveMessage && (
          <div
            className={`mt-4 px-4 py-3 rounded-lg ${
              saveMessage.type === 'success'
                ? 'bg-[#166534] text-[#dcfce7]'
                : 'bg-[#991b1b] text-[#fecaca]'
            }`}
          >
            {saveMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}