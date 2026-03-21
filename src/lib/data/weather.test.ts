import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentWeather } from "@/lib/data/weather";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("getCurrentWeather", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, WEATHER_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns formatted weather data on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          current: {
            temp_f: 72.4,
            feelslike_f: 70.1,
            humidity: 30,
            wind_mph: 8.3,
            wind_dir: "NW",
            condition: {
              text: "Sunny",
              icon: "//cdn.weatherapi.com/weather/64x64/day/113.png",
            },
          },
        }),
    });

    const result = await getCurrentWeather(44.6, -110.5);

    expect(result).toEqual({
      tempF: 72,
      feelsLikeF: 70,
      conditionText: "Sunny",
      conditionIcon:
        "https://cdn.weatherapi.com/weather/64x64/day/113.png",
      humidity: 30,
      windMph: 8,
      windDir: "NW",
    });
  });

  it("rounds temperature and wind values", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          current: {
            temp_f: 72.7,
            feelslike_f: 68.2,
            humidity: 45,
            wind_mph: 12.8,
            wind_dir: "SE",
            condition: {
              text: "Cloudy",
              icon: "https://cdn.weatherapi.com/icon.png",
            },
          },
        }),
    });

    const result = await getCurrentWeather(44.6, -110.5);

    expect(result?.tempF).toBe(73);
    expect(result?.feelsLikeF).toBe(68);
    expect(result?.windMph).toBe(13);
  });

  it("prefixes protocol-relative icon URLs with https:", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          current: {
            temp_f: 50,
            feelslike_f: 48,
            humidity: 60,
            wind_mph: 5,
            wind_dir: "N",
            condition: {
              text: "Rain",
              icon: "//cdn.weatherapi.com/weather/64x64/day/296.png",
            },
          },
        }),
    });

    const result = await getCurrentWeather(37.0, -122.0);

    expect(result?.conditionIcon).toBe(
      "https://cdn.weatherapi.com/weather/64x64/day/296.png",
    );
  });

  it("does not double-prefix icons that already have https:", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          current: {
            temp_f: 50,
            feelslike_f: 48,
            humidity: 60,
            wind_mph: 5,
            wind_dir: "N",
            condition: {
              text: "Clear",
              icon: "https://cdn.weatherapi.com/weather/64x64/day/113.png",
            },
          },
        }),
    });

    const result = await getCurrentWeather(37.0, -122.0);

    expect(result?.conditionIcon).toBe(
      "https://cdn.weatherapi.com/weather/64x64/day/113.png",
    );
  });

  it("returns null when WEATHER_API_KEY is not set", async () => {
    delete process.env.WEATHER_API_KEY;

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await getCurrentWeather(44.6, -110.5);

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("WEATHER_API_KEY not set"),
    );
    consoleSpy.mockRestore();
  });

  it("returns null when the API responds with an error status", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await getCurrentWeather(44.6, -110.5);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("constructs the correct API URL with coordinates", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          current: {
            temp_f: 60,
            feelslike_f: 58,
            humidity: 50,
            wind_mph: 3,
            wind_dir: "W",
            condition: { text: "Clear", icon: "//icon.png" },
          },
        }),
    });

    await getCurrentWeather(36.1, -112.1);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.weatherapi.com/v1/current.json?key=test-api-key&q=36.1,-112.1",
      expect.objectContaining({
        next: { revalidate: 1800 },
      }),
    );
  });
});
