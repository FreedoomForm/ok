import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AdminSettingsProvider } from '@/contexts/AdminSettingsContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://autofood.uz'),
  title: {
    default: "AutoFood - Tizimlashtirilgan Yetkazib Berish Xizmati",
    template: "%s | AutoFood"
  },
  description: "O'zbekistonda restoran va kafelar uchun eng zamonaviy yetkazib berishni avtomatlashtirish tizimi. Kuryerlar nazorati, CRM va hisobotlar.",
  keywords: [
    "AutoFood", "yetkazib berish", "dostavka", "restoran", "crm", "avtomatlashtirish",
    "toshkent", "ozbekiston", "delivery system", "food delivery software",
    "автоматизация доставки", "срм для общепита", "доставка еды ташкент"
  ],
  authors: [{ name: "AutoFood Team", url: "https://autofood.uz" }],
  creator: "AutoFood Inc.",
  publisher: "AutoFood Inc.",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "AutoFood - Biznesingizni Avtomatlashtiring",
    description: "Restoran va kuryerlik xizmatlari uchun mukammal yechim. 30% gacha xarajatlarni qisqartiring.",
    url: "https://autofood.uz",
    siteName: "AutoFood",
    locale: "uz_UZ",
    type: "website",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AutoFood Dashboard Preview',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoFood - Delivery Automation",
    description: "Smart delivery management system for restaurants in Uzbekistan.",
    images: ['/og-image.png'],
    creator: "@autofood_uz",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  verification: {
    google: '-E7Q1ex1NuRnBvPvZqMNLA8EaDPjb__gxkOqXXuQ4Lk',
  },
  category: 'business',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <LanguageProvider>
          <AdminSettingsProvider>
            {children}
            <Toaster />
          </AdminSettingsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
