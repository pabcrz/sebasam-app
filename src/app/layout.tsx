import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegister } from "./pwa-register";
import { ThemeScript } from "@/components/theme-script";
import { ThemeProvider } from "@/components/theme-provider";
import { ToasterProvider } from "@/components/ui/toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Operaciones SEBASAM",
    template: "%s | Operaciones SEBASAM",
  },
  description: "Aplicación operativa de SEBASAM para cotizaciones, órdenes de trabajo y ejecución de campo.",
  manifest: "/manifest.webmanifest",
  applicationName: "Operaciones SEBASAM",
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
    title: "Operaciones SEBASAM",
    description: "Aplicación operativa de SEBASAM para cotizaciones, órdenes de trabajo y ejecución de campo.",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: "Operaciones SEBASAM",
    description: "Aplicación operativa de SEBASAM para cotizaciones, órdenes de trabajo y ejecución de campo.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
