"use client";

import { MAP_STYLES } from "@/lib/config/map";
import type { MapStyleKey } from "@/types/map";

interface MapStyleSwitcherProps {
  currentStyle: MapStyleKey;
  onStyleChange: (style: MapStyleKey) => void;
}

export function MapStyleSwitcher({
  currentStyle,
  onStyleChange,
}: MapStyleSwitcherProps) {
  const stadiaKey = process.env.NEXT_PUBLIC_STADIA_API_KEY;
  const outdoorsAvailable = Boolean(stadiaKey);

  return (
    <div className="absolute top-4 right-4 z-10 flex overflow-hidden rounded-lg bg-white shadow-md">
      {(
        Object.entries(MAP_STYLES) as [
          MapStyleKey,
          (typeof MAP_STYLES)[MapStyleKey],
        ][]
      ).map(([key, style]) => {
        const isDisabled = style.requiresApiKey && !outdoorsAvailable;
        const isActive = currentStyle === key;

        return (
          <button
            type="button"
            key={key}
            onClick={() => !isDisabled && onStyleChange(key)}
            disabled={isDisabled}
            title={
              isDisabled
                ? "Stadia API key required"
                : `Switch to ${style.name} basemap`
            }
            className={`
                px-3 py-1.5 text-sm font-medium transition-colors
                ${
                  isActive
                    ? "bg-green-700 text-white"
                    : isDisabled
                      ? "cursor-not-allowed text-gray-300"
                      : "text-gray-600 hover:bg-gray-100"
                }
              `}
          >
            {style.name}
          </button>
        );
      })}
    </div>
  );
}
