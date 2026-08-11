import type { Metadata, Viewport } from "next";
import { DM_Mono, Inter } from "next/font/google";
import { PwaRegister } from "./pwa-register";
import { ThemeScript } from "@/components/theme-script";
import { ThemeProvider } from "@/components/theme-provider";
import { ToasterProvider } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
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
      className={`${inter.variable} ${dmMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <PwaRegister />
          <ToasterProvider />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
