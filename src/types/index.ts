// src/types/index.ts

import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';

export type WidgetComponent = ComponentType<any> | LazyExoticComponent<ComponentType<any>>;

/**
 * Define la estructura de la configuración estática de un widget.
 * Cada widget debe exportar un objeto con esta forma.
 */
export interface WidgetConfig {
  id: string;
  title: string;
  icon: string | ReactNode;
  defaultSize: { width: number; height: number };
  startTooltip?: string;
  searchKeywords?: string[];
  component: WidgetComponent; // El componente de React como una función (cargado bajo demanda)
}

/**
 * Define la estructura de un widget que está actualmente activo en el escritorio.
 */
export interface ActiveWidget {
  instanceId: string;
  widgetId: string;
  position: { x: number; y: number };
  size: { width: number | string; height: number | string };
  zIndex: number;
  titleOverride?: string;
  zoom?: number;
  toolbarPinned?: boolean;
  
  // --- LÍNEAS AÑADIDAS ---
  isMinimized?: boolean;
  isMaximized?: boolean;
  previousPosition?: { x: number; y: number };
  previousSize?: { width: number | string; height: number | string };
  // --- FIN DE LÍNEAS AÑADIDAS ---
}

/**
 * Define la estructura para un único perfil de escritorio guardado.
 * Contiene todos los ajustes que queremos persistir.
 */
export interface DesktopProfile {
  theme: any; // Usamos 'any' por simplicidad, se refiere a la estructura Theme de ThemeContext
  activeWidgets: ActiveWidget[];
  pinnedWidgets: string[];
  vceFavorites?: string[];
  widgetPreferences?: Record<string, { zoom?: number; toolbarPinned?: boolean }>;
}

/**
 * Define la colección de todos los perfiles guardados,
 * usando el nombre del perfil como clave.
 */
export type ProfileCollection = Record<string, DesktopProfile>;
