import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CurrentWeatherSection } from "@/app/(map)/_components/CurrentWeatherSection";
import { createMockWeather } from "@/test/fixtures";

afterEach(cleanup);

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CurrentWeatherSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves

    render(<CurrentWeatherSection unitCode="YELL" />);

    expect(screen.getByText("Loading weather…")).toBeInTheDocument();
  });

  it("renders weather data on successful fetch", async () => {
    const weather = createMockWeather({
      tempF: 72,
      feelsLikeF: 70,
      conditionText: "Sunny",
      humidity: 30,
      windMph: 8,
      windDir: "NW",
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(weather),
    });

    render(<CurrentWeatherSection unitCode="YELL" />);

    await waitFor(() => {
      expect(screen.getByText("72°F")).toBeInTheDocument();
    });

    expect(screen.getByText("Sunny")).toBeInTheDocument();
    expect(screen.getByText("Feels 70°F")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("renders nothing when fetch fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });

    const { container } = render(<CurrentWeatherSection unitCode="YELL" />);

    await waitFor(() => {
      expect(screen.queryByText("Loading weather…")).not.toBeInTheDocument();
    });

    // After loading completes with no weather, should render nothing
    // (the component returns null when weather is null and not loading)
    expect(container.querySelector(".flex.items-center.gap-3")).toBeNull();
  });

  it("fetches weather for the correct park code", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(createMockWeather()),
    });

    render(<CurrentWeatherSection unitCode="GRCA" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/parks/GRCA/weather");
    });
  });

  it("displays weather icon with alt text", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(
          createMockWeather({
            conditionText: "Partly cloudy",
            conditionIcon: "https://cdn.weatherapi.com/icon.png",
          }),
        ),
    });

    render(<CurrentWeatherSection unitCode="YELL" />);

    await waitFor(() => {
      const img = screen.getByAltText("Partly cloudy");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://cdn.weatherapi.com/icon.png");
    });
  });

  it("handles fetch error gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { container } = render(<CurrentWeatherSection unitCode="YELL" />);

    await waitFor(() => {
      expect(screen.queryByText("Loading weather…")).not.toBeInTheDocument();
    });

    // Should not crash, render nothing
    expect(container.querySelector(".flex.items-center.gap-3")).toBeNull();
  });
});
