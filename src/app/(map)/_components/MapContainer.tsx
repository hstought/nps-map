"use client";

import dynamic from "next/dynamic";
import { loadOverview } from "@/lib/data/overview-client";

// Start downloading park boundaries before the MapLibre chunk arrives.
if (typeof window !== "undefined") {
  loadOverview().catch(() => {
    // MapView retries and reports the error itself.
  });
}

const MapView = dynamic(() => import("./MapView").then((mod) => mod.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-300 border-t-green-700" />
        <p className="text-sm text-gray-500">Loading map…</p>
      </div>
    </div>
  ),
});

export function MapContainer() {
  return (
    <div className="h-screen w-screen">
      <MapView />
    </div>
  );
}
