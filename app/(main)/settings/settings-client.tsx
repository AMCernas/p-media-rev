'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme, type Theme } from '@/lib/theme-context';

interface SettingsClientProps {
  initialSettings: {
    profileName: string;
    preferredLanguage: string;
    librarySort: string;
    theme: string;
  };
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const { theme: currentTheme, setTheme } = useTheme();
  const [profileName, setProfileName] = useState(initialSettings.profileName);
  const [preferredLanguage, setPreferredLanguage] = useState(initialSettings.preferredLanguage);
  const [librarySort, setLibrarySort] = useState(initialSettings.librarySort);
  const [themeValue, setThemeValue] = useState(initialSettings.theme);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const changed = 
      profileName !== initialSettings.profileName ||
      preferredLanguage !== initialSettings.preferredLanguage ||
      librarySort !== initialSettings.librarySort ||
      themeValue !== initialSettings.theme;
    setHasChanges(changed);
  }, [profileName, preferredLanguage, librarySort, themeValue, initialSettings]);

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
          theme: themeValue,
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
  }, [profileName, preferredLanguage, librarySort, themeValue]);

  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme);                 // apply to DOM immediately
    setThemeValue(newTheme);            // track for save
  }, [setTheme]);

  return (
    <div className="space-y-6">
      {/* Profile Name */}
      <div className="space-y-2">
        <label htmlFor="profileName" className="block text-sm font-medium text-foreground">
          Nombre de perfil
        </label>
        <input
          id="profileName"
          type="text"
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          placeholder="Tu nombre personalizado"
          className="w-full px-4 py-3 bg-muted border border-input rounded-lg text-foreground placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
        />
        <p className="text-xs text-muted-2">
          Este nombre aparecerá en el saludo del Dashboard
        </p>
      </div>

      {/* Preferred Language */}
      <div className="space-y-2">
        <label htmlFor="preferredLanguage" className="block text-sm font-medium text-foreground">
          Idioma preferido
        </label>
        <select
          id="preferredLanguage"
          value={preferredLanguage}
          onChange={(e) => setPreferredLanguage(e.target.value)}
          className="w-full px-4 py-3 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors appearance-none cursor-pointer"
        >
          <option value="es-ES">Español</option>
          <option value="en-US">English</option>
        </select>
        <p className="text-xs text-muted-2">
          Afecta los resultados de TMDB (películas y series populares, trending)
        </p>
      </div>

      {/* Library Sort */}
      <div className="space-y-2">
        <label htmlFor="librarySort" className="block text-sm font-medium text-foreground">
          Orden predeterminado de la biblioteca
        </label>
        <select
          id="librarySort"
          value={librarySort}
          onChange={(e) => setLibrarySort(e.target.value)}
          className="w-full px-4 py-3 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors appearance-none cursor-pointer"
        >
          <option value="updatedAt_desc">Más reciente primero</option>
          <option value="updatedAt_asc">Más antiguo primero</option>
          <option value="rating_desc">Mejor rating primero</option>
          <option value="title_asc">Orden alfabético (A-Z)</option>
        </select>
        <p className="text-xs text-muted-2">
          Orden por defecto al ver tu biblioteca
        </p>
      </div>

      {/* Theme Toggle */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Tema de la aplicación
        </label>
        <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              currentTheme === 'dark'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="material-symbols-outlined text-lg">dark_mode</span>
            Oscuro
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              currentTheme === 'light'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="material-symbols-outlined text-lg">light_mode</span>
            Claro
          </button>
        </div>
        <p className="text-xs text-muted-2">
          Cambia entre tema oscuro y claro. El cambio es inmediato.
        </p>
      </div>

      {/* Save Button */}
      <div className="pt-4">
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            hasChanges && !isSaving
              ? 'bg-primary text-white hover:bg-[#7c3aed] cursor-pointer'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
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