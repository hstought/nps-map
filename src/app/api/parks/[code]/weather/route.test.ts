import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockParkDetail, createMockWeather } from "@/test/fixtures";

vi.mock("@/lib/data/parks", () => ({
  getParkDetail: vi.fn(),
}));

vi.mock("@/lib/data/weather", () => ({
  getCurrentWeather: vi.fn(),
}));

import { GET } from "@/app/api/parks/[code]/weather/route";
import { getParkDetail } from "@/lib/data/parks";
import { getCurrentWeather } from "@/lib/data/weather";

const mockGetParkDetail = vi.mocked(getParkDetail);
const mockGetCurrentWeather = vi.mocked(getCurrentWeather);

function createRequest(): Request {
  return new Request("http://localhost:3000/api/parks/YELL/weather");
}

describe("GET /api/parks/[code]/weather", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns weather data for a park with coordinates", async () => {
    mockGetParkDetail.mockResolvedValue(
      createMockParkDetail({ latitude: 44.6, longitude: -110.5 }),
    );
    mockGetCurrentWeather.mockResolvedValue(createMockWeather());

    const response = await GET(createRequest(), {
      params: Promise.resolve({ code: "yell" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tempF).toBe(72);
    expect(body.conditionText).toBe("Sunny");
  });

  it("passes park coordinates to weather service", async () => {
    mockGetParkDetail.mockResolvedValue(
      createMockParkDetail({ latitude: 36.1, longitude: -112.1 }),
    );
    mockGetCurrentWeather.mockResolvedValue(createMockWeather());

    await GET(createRequest(), {
      params: Promise.resolve({ code: "grca" }),
    });

    expect(mockGetCurrentWeather).toHaveBeenCalledWith(36.1, -112.1);
  });

  it("returns 400 for empty code", async () => {
    const response = await GET(createRequest(), {
      params: Promise.resolve({ code: "" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 when park is not found", async () => {
    mockGetParkDetail.mockResolvedValue(null);

    const response = await GET(createRequest(), {
      params: Promise.resolve({ code: "XXXX" }),
    });

    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe("Park not found");
  });

  it("returns 404 when park has no coordinates", async () => {
    mockGetParkDetail.mockResolvedValue(
      createMockParkDetail({ latitude: null, longitude: null }),
    );

    const response = await GET(createRequest(), {
      params: Promise.resolve({ code: "yell" }),
    });

    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe("Park has no coordinates");
  });

  it("returns 503 when weather data is unavailable", async () => {
    mockGetParkDetail.mockResolvedValue(createMockParkDetail());
    mockGetCurrentWeather.mockResolvedValue(null);

    const response = await GET(createRequest(), {
      params: Promise.resolve({ code: "yell" }),
    });

    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("Weather data unavailable");
  });

  it("sets 30-minute cache headers", async () => {
    mockGetParkDetail.mockResolvedValue(createMockParkDetail());
    mockGetCurrentWeather.mockResolvedValue(createMockWeather());

    const response = await GET(createRequest(), {
      params: Promise.resolve({ code: "yell" }),
    });

    expect(response.headers.get("Cache-Control")).toContain("max-age=1800");
  });

  it("returns 500 on unexpected error", async () => {
    mockGetParkDetail.mockRejectedValue(new Error("Network error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET(createRequest(), {
      params: Promise.resolve({ code: "yell" }),
    });

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("Failed to fetch weather");
    consoleSpy.mockRestore();
  });
});
