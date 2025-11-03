import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import { UnregisterServiceWorker } from "@/components/unregister-sw";

const satoshi = localFont({
  src: [
    {
      path: "./fonts/satoshi/Satoshi-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/satoshi/Satoshi-LightItalic.otf",
      weight: "300",
      style: "italic",
    },
    {
      path: "./fonts/satoshi/Satoshi-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/satoshi/Satoshi-Italic.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/satoshi/Satoshi-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/satoshi/Satoshi-MediumItalic.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "./fonts/satoshi/Satoshi-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/satoshi/Satoshi-BoldItalic.otf",
      weight: "700",
      style: "italic",
    },
    {
      path: "./fonts/satoshi/Satoshi-Black.otf",
      weight: "900",
      style: "normal",
    },
    {
      path: "./fonts/satoshi/Satoshi-BlackItalic.otf",
      weight: "900",
      style: "italic",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Waka Agent",
  description: "waka agent web app",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#7CB342",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#7CB342" />
      </head>
      <body
        className={`${satoshi.variable} font-sans antialiased`}
      >
        <UnregisterServiceWorker />
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster position="top-right" richColors/>
      </body>
    </html>
  );
}
