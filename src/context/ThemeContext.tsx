import React, { createContext, useContext } from 'react';
import { defaultWallpaperValue } from '../utils/wallpapers';

// 1. Definimos la estructura del tema.
export interface Theme {
  '--color-bg': string;
  '--color-widget-bg': string;
  '--color-widget-header': string;
  '--color-accent': string;
  '--color-text-light': string;
  '--color-text-dark': string;
  '--color-border': string;
  '--wallpaper': string;
  '--font-scale': string;
  showDateTime: boolean;
  showSystemStats: boolean;
  highContrast: boolean;
}

// 2. ACTUALIZAMOS los colores por defecto.
export const defaultTheme: Theme = {
  '--color-bg': '#FFFFFF', // <-- ¡Aquí está el cambio a blanco!
  '--color-widget-bg': '#00809D',
  '--color-widget-header': '#D3AF37',
  '--color-accent': '#FFD700',
  '--color-text-light': '#FCF8DD',
  '--color-text-dark': '#1a202c',
  '--color-border': '#FFFFFF',
  '--wallpaper': defaultWallpaperValue,
  '--font-scale': '1',
  showDateTime: true,
  showSystemStats: false,
  highContrast: false,
};

// 3. Definimos lo que nuestro contexto va a proveer.
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme | ((val: Theme) => Theme)) => void;
  setWallpaper: (wallpaperUrl: string) => void;
  resetTheme: () => void;
  defaultTheme: Theme;
}

// El resto del archivo no necesita cambios.
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode; value: ThemeContextType }> = ({ children, value }) => {
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
