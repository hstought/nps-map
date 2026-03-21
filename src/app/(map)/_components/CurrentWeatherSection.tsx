"use client";

import { Droplets, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import type { CurrentWeather } from "@/types/park";

interface CurrentWeatherSectionProps {
  unitCode: string;
}

export function CurrentWeatherSection({
  unitCode,
}: CurrentWeatherSectionProps) {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather() {
      try {
        const response = await fetch(`/api/parks/${unitCode}/weather`);
        if (!response.ok) return;
        const data: CurrentWeather = await response.json();
        if (!cancelled) setWeather(data);
      } catch {
        // Silently fail — weather is non-critical
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchWeather();
    return () => {
      cancelled = true;
    };
  }, [unitCode]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
        <span className="text-xs text-blue-600">Loading weather…</span>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-blue-50 to-sky-50 px-3 py-2">
      {/* Left: icon + temp + feels like stacked */}
      <div className="flex items-center gap-1.5">
        {/* biome-ignore lint: WeatherAPI CDN icon, no need for Next Image optimization */}
        <img
          src={weather.conditionIcon}
          alt={weather.conditionText}
          width={36}
          height={36}
          className="h-9 w-9"
          title={`Current conditions: ${weather.conditionText}`}
        />
        <div className="flex flex-col">
          <span
            className="text-lg font-semibold leading-tight text-gray-900"
            title={`Current temperature: ${weather.tempF}°F`}
          >
            {weather.tempF}°F
          </span>
          <span
            className="text-[10px] leading-tight text-gray-500"
            title={`Feels like ${weather.feelsLikeF}°F with wind chill`}
          >
            Feels {weather.feelsLikeF}°F
          </span>
        </div>
      </div>

      {/* Right: condition, wind, humidity — subdued */}
      <div className="ml-auto flex flex-col items-end gap-0.5">
        <span
          className="text-xs font-medium text-gray-700"
          title={`Weather condition: ${weather.conditionText}`}
        >
          {weather.conditionText}
        </span>
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <span
            className="flex items-center gap-0.5"
            title={`Wind speed: ${weather.windMph} mph, direction: ${weather.windDir}`}
          >
            <Wind className="h-3 w-3" />
            {weather.windMph} mph {weather.windDir}
          </span>
          <span
            className="flex items-center gap-0.5"
            title={`Humidity: ${weather.humidity}%`}
          >
            <Droplets className="h-3 w-3" />
            {weather.humidity}%
          </span>
        </div>
      </div>
    </div>
  );
}
