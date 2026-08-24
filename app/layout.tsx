import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SuperAdminOmnibox } from "@/components/SuperAdminOmnibox";
import ToastProvider from "@/components/ToastProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Église Connect",
  description: "Connectés à Dieu, unis entre nous.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <meta name="application-name" content="Église Connect" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Église Connect" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1e3a8a" />
      </head>
      <body className="antialiased">
        {children}
        <SuperAdminOmnibox />
        <ToastProvider />
      </body>
    </html>
  );
}
