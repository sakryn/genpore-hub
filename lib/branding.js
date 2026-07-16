/**
 * BRANDING CONFIGURATION
 *
 * The only file you edit to re-skin this app for a different company.
 * Colors here are injected as CSS variables by ThemeProvider — never hardcode
 * a brand color in globals.css or a component.
 *
 * GenPore's brand is a single blue with black text on white. The blue below was
 * sampled from their logo file, not eyeballed from a screenshot.
 */

export const BRANDING = {
  // === COMPANY IDENTITY ===
  company_name: 'GenPore',
  full_app_title: 'GenPore Training Portal',
  logo_path: '/genpore-logo.png',
  favicon_path: '/favicon.ico',

  // === PRIMARY BRAND COLOR ===
  // #0079C0 sampled from the logo wordmark; #0070BC is the deeper tone used on
  // their site's "Request a Quote" button, which reads well as a hover state.
  primary_color: '#0079C0',
  primary_color_hover: '#005E96',
  primary_color_text: '#FFFFFF',

  // === NEUTRALS ===
  background: '#FFFFFF',
  surface: '#F4F7FA',
  text_primary: '#101820',
  text_secondary: '#5A6672',
  border: '#DDE4EA',

  // Page backdrop — the surround beside the centered content panel.
  app_background: '#EEF2F6',

  // Admin dashboard backdrop. That page uses inline styles and does NOT read
  // globals.css, so it needs its own value.
  admin_background: '#0f1114',

  // === STATUS COLORS ===
  success: '#1E8E4E', // completed
  muted: '#8A96A3',   // not started

  // === FOOTER ===
  footer_text: 'GenPore — A Division of General Polymeric Corporation',
  footer_show: true,
};

export default BRANDING;
