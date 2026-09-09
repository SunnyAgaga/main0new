import { useEffect } from 'react';
import { useGetSiteSettings } from '@/api';

function hexToHslTriplet(hex: string): string | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;

  const int = parseInt(match[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Applies admin-configured colors as CSS custom properties, site-wide. */
export function SiteTheme() {
  const { data: settings } = useGetSiteSettings();

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;

    const background = hexToHslTriplet(settings.backgroundColor);
    const primary = hexToHslTriplet(settings.primaryColor);
    const accent = hexToHslTriplet(settings.accentColor);

    if (background) root.style.setProperty('--background', background);
    if (primary) {
      root.style.setProperty('--primary', primary);
      root.style.setProperty('--ring', primary);
    }
    if (accent) root.style.setProperty('--accent', accent);

    return () => {
      root.style.removeProperty('--background');
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--accent');
    };
  }, [settings]);

  return null;
}
