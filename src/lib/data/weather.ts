import type { CurrentWeather } from "@/types/park";

interface WeatherApiResponse {
  current: {
    temp_f: number;
    feelslike_f: number;
    humidity: number;
    wind_mph: number;
    wind_dir: string;
    condition: {
      text: string;
      icon: string;
    };
  };
}

/**
 * Fetch current weather from WeatherAPI.com for given coordinates.
 * Returns null if the API key is missing or the request fails.
 */
export async function getCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<CurrentWeather | null> {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    console.warn("WEATHER_API_KEY not set — skipping weather fetch");
    return null;
  }

  const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${latitude},${longitude}`;

  const response = await fetch(url, {
    next: { revalidate: 1800 }, // Cache for 30 minutes server-side
  });

  if (!response.ok) {
    console.error(
      `WeatherAPI error: ${response.status} ${response.statusText}`,
    );
    return null;
  }

  const data: WeatherApiResponse = await response.json();

  return {
    tempF: Math.round(data.current.temp_f),
    feelsLikeF: Math.round(data.current.feelslike_f),
    conditionText: data.current.condition.text,
    // WeatherAPI returns protocol-relative URLs like //cdn.weatherapi.com/...
    conditionIcon: data.current.condition.icon.startsWith("//")
      ? `https:${data.current.condition.icon}`
      : data.current.condition.icon,
    humidity: data.current.humidity,
    windMph: Math.round(data.current.wind_mph),
    windDir: data.current.wind_dir,
  };
}
