import './globals.css';
import { BRANDING } from '@/lib/branding';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata = {
  title: BRANDING.full_app_title,
  description: `${BRANDING.company_name} employee training`,
  icons: { icon: BRANDING.favicon_path },
};

export default function RootLayout({ children }) {
  // lang is set to English here as the document default. The learner-facing
  // pages set their own lang attribute client-side once the user's preference
  // is known, which matters for screen readers and for correct hyphenation.
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
