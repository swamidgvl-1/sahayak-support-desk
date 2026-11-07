import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SwRegister } from '@/components/ClientBits';
import { APP_NAME } from '@/lib/utils';

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — Support Desk`, template: `%s · ${APP_NAME}` },
  description: 'Raise and track student support tickets in one place.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: 'default' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#7c4a2d',
};

const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
