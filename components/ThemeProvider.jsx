'use client';

import { useEffect } from 'react';
import { BRANDING } from '@/lib/branding';

/**
 * Injects branding values as CSS custom properties on :root at runtime, so
 * globals.css can reference var(--primary-color) and a rebrand is a one-file
 * change.
 *
 * Every rule in globals.css uses a fallback — var(--primary-color, #0079C0) —
 * so if this ever fails to run the app degrades to sensible colors rather than
 * rendering unstyled.
 */
export default function ThemeProvider({ children }) {
  useEffect(() => {
    const root = document.documentElement;
    const set = (k, v) => v && root.style.setProperty(k, v);

    set('--primary-color', BRANDING.primary_color);
    set('--primary-color-hover', BRANDING.primary_color_hover);
    set('--primary-color-text', BRANDING.primary_color_text);
    set('--background', BRANDING.background);
    set('--surface', BRANDING.surface);
    set('--text-primary', BRANDING.text_primary);
    set('--text-secondary', BRANDING.text_secondary);
    set('--border', BRANDING.border);
    set('--app-bg', BRANDING.app_background);
    set('--success', BRANDING.success);
    set('--muted', BRANDING.muted);
  }, []);

  return children;
}
