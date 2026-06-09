import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AdminSettingsProvider } from '@/contexts/AdminSettingsContext';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { PWANetworkStatus } from '@/components/PWANetworkStatus';
import { TamboProviderClient } from "@/components/providers/TamboProviderClient";
import { ThemeProvider } from "next-themes";

/* IA-first Dense UX: Inter — well-readable, supports Cyrillic, many weights, SaaS standard */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://autofood.uz'),
  title: {
    default: "AutoFood - Delivery Operations Platform",
    template: "%s | AutoFood"
  },
  description: "O'zbekistonda restoran va kafelar uchun zamonaviy yetkazib berishni avtomatlashtirish tizimi.",
  keywords: [
    "AutoFood", "yetkazib berish", "dostavka", "restoran", "delivery system",
    "food delivery software", "avtomatlashtirish dostavki"
  ],
  authors: [{ name: "AutoFood Team", url: "https://autofood.uz" }],
  creator: "AutoFood Inc.",
  openGraph: {
    title: "AutoFood - Delivery Operations Platform",
    description: "Restoran va kuryerlik xizmatlari uchun mukammal yechim.",
    url: "https://autofood.uz",
    siteName: "AutoFood",
    locale: "uz_UZ",
    type: "website",
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'AutoFood' }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoFood",
    description: "Smart delivery management for restaurants.",
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.ico' },
  manifest: '/manifest.json',
  verification: { google: '-E7Q1ex1NuRnBvPvZqMNLA8EaDPjb__gxkOqXXuQ4Lk' },
  category: 'business',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#111112' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="">
      <head>
        <meta name="application-name" content="AutoFood" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AutoFood" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={true}
          disableTransitionOnChange={true}
        >
        <LanguageProvider>
          <AdminSettingsProvider>
            <TamboProviderClient>
              <ServiceWorkerRegistration />
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-elevated"
              >
                Skip to content
              </a>
              <div id="main-content">{children}</div>
              <PWANetworkStatus />
              <PWAInstallPrompt />
              <Toaster />
            </TamboProviderClient>
          </AdminSettingsProvider>
        </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


