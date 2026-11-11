import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { PwaRegister } from "./pwa-register";
import { ThemeScript } from "@/components/theme-script";
import { ThemeProvider } from "@/components/theme-provider";
import { FontScaleScript } from "@/components/font-scale-script";
import { FontScaleProvider } from "@/components/font-scale-provider";
import { ToasterProvider } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "https://app.sebasam.online")
  ),
  title: {
    default: "SEBASAM",
    template: "%s | SEBASAM",
  },
  description: "Portal de clientes SEBASAM para gestión de servicios y cotizaciones.",
  manifest: "/manifest.webmanifest",
  applicationName: "SEBASAM",
  appleWebApp: {
    capable: true,
    title: "SEBASAM",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "SEBASAM",
    description: "Portal de clientes SEBASAM para gestión de servicios y cotizaciones.",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: "SEBASAM",
    description: "Portal de clientes SEBASAM para gestión de servicios y cotizaciones.",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#004AAD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
        <FontScaleScript />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <FontScaleProvider>
            <PwaRegister />
            <ToasterProvider />
            {children}
          </FontScaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
