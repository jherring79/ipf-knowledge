import type { Metadata, Viewport } from "next";
import "./globals.css";
import OfflineProvider from "@/components/OfflineProvider";
import OfflineBanner from "@/components/OfflineBanner";

export const metadata: Metadata = {
  title: "IPF Knowledge",
  description:
    "IP Filtration field knowledge capture — photos and notes from the field, all in one place.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IPF Knowledge",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-dvh bg-slate-950 text-slate-100 antialiased">
        {/* Wraps every screen: registers the service worker, watches
            connectivity, and drains the offline queue whenever service
            comes back. */}
        <OfflineProvider>
          <OfflineBanner />
          {children}
        </OfflineProvider>
      </body>
    </html>
  );
}
