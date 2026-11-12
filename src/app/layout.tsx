import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { preconnect, preload } from "react-dom";
import { MAP_STYLE_URL } from "@/lib/config/map";
import { OVERVIEW_URL } from "@/lib/data/overview-client";
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
  title: "National Park Maps — Explore National Park Boundaries",
  description:
    "Interactive map of all National Park Service units. Explore boundaries, view park photos, and learn about America's public lands.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Start the park-boundary download and the map-tile connection in parallel
  // with the JavaScript bundle instead of after it.
  preload(OVERVIEW_URL, { as: "fetch", crossOrigin: "anonymous" });
  preconnect(new URL(MAP_STYLE_URL).origin, { crossOrigin: "anonymous" });

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
