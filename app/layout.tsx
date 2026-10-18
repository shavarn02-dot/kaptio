import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: { default: 'Kaptio — Your story. In every language.', template: '%s — Kaptio' },
  description: 'Turn your video into a story everyone can follow. Create, place, and style multilingual captions with Kaptio.',
  applicationName: 'Kaptio',
  openGraph: { title: 'Kaptio — Your story. In every language.', description: 'Good stories deserve to be understood. Multilingual captions, made yours.', type: 'website' },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f5f4ef' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
