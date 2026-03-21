import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockBoundaryCollection } from "@/test/fixtures";

// Mock the data layer
vi.mock("@/lib/data/parks", () => ({
  getParkBoundaries: vi.fn(),
  isMemoryError: vi.fn(),
}));

import { getParkBoundaries, isMemoryError } from "@/lib/data/parks";
import { GET } from "@/app/api/parks/route";

const mockGetParkBoundaries = vi.mocked(getParkBoundaries);
const mockIsMemoryError = vi.mocked(isMemoryError);

function createRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/parks");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe("GET /api/parks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockIsMemoryError.mockReturnValue(false);
  });

  it("returns park boundaries for valid bbox and zoom", async () => {
    const mockData = createMockBoundaryCollection(2);
    mockGetParkBoundaries.mockResolvedValue(mockData);

    const request = createRequest({
      bbox: "-111,44,-110,45",
      zoom: "5",
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.type).toBe("FeatureCollection");
    expect(body.features).toHaveLength(2);
  });

  it("sets cache headers on success", async () => {
    mockGetParkBoundaries.mockResolvedValue(createMockBoundaryCollection(0));

    const request = createRequest({
      bbox: "-111,44,-110,45",
      zoom: "5",
    });

    const response = await GET(request);

    expect(response.headers.get("Cache-Control")).toContain("public");
    expect(response.headers.get("Cache-Control")).toContain("max-age=300");
  });

  it("returns 400 when bbox is missing", async () => {
    const request = createRequest({ zoom: "5" });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Missing required parameters");
  });

  it("returns 400 when zoom is missing", async () => {
    const request = createRequest({ bbox: "-111,44,-110,45" });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Missing required parameters");
  });

  it("returns 400 for invalid bbox format", async () => {
    const request = createRequest({
      bbox: "not,valid,numbers,here",
      zoom: "5",
    });

    const response = await GET(request);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("Invalid bbox format");
  });

  it("returns 400 for invalid zoom value", async () => {
    const request = createRequest({
      bbox: "-111,44,-110,45",
      zoom: "abc",
    });

    const response = await GET(request);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("Invalid zoom");
  });

  it("returns 503 with Retry-After on memory error", async () => {
    mockGetParkBoundaries.mockRejectedValue(new Error("std::bad_alloc"));
    mockIsMemoryError.mockReturnValue(true);

    const request = createRequest({
      bbox: "-111,44,-110,45",
      zoom: "5",
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET(request);

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("5");
    consoleSpy.mockRestore();
  });

  it("returns 500 on generic server error", async () => {
    mockGetParkBoundaries.mockRejectedValue(new Error("DB connection failed"));
    mockIsMemoryError.mockReturnValue(false);

    const request = createRequest({
      bbox: "-111,44,-110,45",
      zoom: "5",
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET(request);

    expect(response.status).toBe(500);
    expect((await response.json()).error).toContain(
      "Failed to fetch park boundaries",
    );
    consoleSpy.mockRestore();
  });
});
