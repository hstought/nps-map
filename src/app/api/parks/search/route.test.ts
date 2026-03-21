import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/parks", () => ({
  searchParks: vi.fn(),
}));

import { searchParks } from "@/lib/data/parks";
import { GET } from "@/app/api/parks/search/route";

const mockSearchParks = vi.mocked(searchParks);

function createRequest(query?: string): NextRequest {
  const url = new URL("http://localhost:3000/api/parks/search");
  if (query !== undefined) {
    url.searchParams.set("q", query);
  }
  return new NextRequest(url);
}

describe("GET /api/parks/search", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns search results for valid query", async () => {
    const mockResults = [
      {
        unitCode: "YELL",
        unitName: "Yellowstone National Park",
        unitType: "National Park",
        state: "WY",
        latitude: 44.6,
        longitude: -110.5,
      },
    ];
    mockSearchParks.mockResolvedValue(mockResults);

    const response = await GET(createRequest("yellowstone"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].unitCode).toBe("YELL");
  });

  it("returns empty array for short queries (< 2 chars)", async () => {
    const response = await GET(createRequest("a"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
    expect(mockSearchParks).not.toHaveBeenCalled();
  });

  it("returns empty array when query is missing", async () => {
    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  it("returns empty array for whitespace-only query", async () => {
    const response = await GET(createRequest("   "));
    const body = await response.json();

    expect(body).toEqual([]);
    expect(mockSearchParks).not.toHaveBeenCalled();
  });

  it("trims query before searching", async () => {
    mockSearchParks.mockResolvedValue([]);

    await GET(createRequest("  yellowstone  "));

    expect(mockSearchParks).toHaveBeenCalledWith("yellowstone");
  });

  it("sets cache headers", async () => {
    mockSearchParks.mockResolvedValue([]);

    const response = await GET(createRequest("yellow"));

    expect(response.headers.get("Cache-Control")).toContain("max-age=60");
  });

  it("returns 500 on search error", async () => {
    mockSearchParks.mockRejectedValue(new Error("DB error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET(createRequest("yellow"));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("Failed to search parks");
    consoleSpy.mockRestore();
  });
});
