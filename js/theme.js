// theme.js — Apariencia: "auto" sigue al iPhone; "light" y "dark" fuerzan un modo.
// Copia de finanzas-ia/src/lib/theme.ts (Plata): mismo comportamiento en las dos apps.
//
// Vive en localStorage y NO en IndexedDB (prefGet/prefSet) a propósito: el modo
// se tiene que conocer ANTES de pintar el primer frame, y IndexedDB contesta
// tarde, así que la app arrancaría en un color y saltaría al otro. Perderla no
// hace daño (vuelve a Automático), por eso tampoco va en PREFS_IMPORTABLES.
// El <script> clásico del <head> de index.html repite la parte de leer y
// aplicar: si cambias la clave o la lógica aquí, cámbialas allá también.

export const THEME_STORAGE_KEY = 'gymtracker-theme';

export const THEME_LABELS = { auto: 'Automático', light: 'Claro', dark: 'Oscuro' };

// Mismos colores que --color-background en styles.css: pintan la barra de estado.
const THEME_COLORS = { light: '#fbf6ee', dark: '#2d353b' };

const darkModeQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

export function readThemePreference() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Sin acceso al almacenamiento: se queda en automático.
  }
  return 'auto';
}

export function applyThemePreference(preference) {
  const resolved = preference === 'auto' ? (darkModeQuery().matches ? 'dark' : 'light') : preference;
  document.documentElement.dataset.theme = resolved;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.content = THEME_COLORS[resolved];
  });
}

export function saveThemePreference(preference) {
  try {
    if (preference === 'auto') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Se aplica igual en esta sesión; solo no se recordará al reabrir.
  }
  applyThemePreference(preference);
}

// En "auto", si el iPhone cambia de modo (por ejemplo al anochecer), la app lo sigue.
export function startThemeSync() {
  applyThemePreference(readThemePreference());
  darkModeQuery().addEventListener('change', () => {
    if (readThemePreference() === 'auto') applyThemePreference('auto');
  });
}
