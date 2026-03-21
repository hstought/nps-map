import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAllParksFromNpsApi } from "@/lib/data/nps-api";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("fetchAllParksFromNpsApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("fetches parks across multiple pages", async () => {
    const page1Parks = Array.from({ length: 50 }, (_, i) => ({
      parkCode: `park${i}`,
      fullName: `Park ${i}`,
    }));
    const page2Parks = [{ parkCode: "park50", fullName: "Grand Canyon" }];

    // Page 1: returns 50 parks, total = 51
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          total: "51",
          limit: "50",
          start: "0",
          data: page1Parks,
        }),
    });

    // Page 2: returns 1 park
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          total: "51",
          limit: "50",
          start: "50",
          data: page2Parks,
        }),
    });

    const parks = await fetchAllParksFromNpsApi("test-key");

    expect(parks).toHaveLength(51);
    expect(parks[0].parkCode).toBe("park0");
    expect(parks[50].parkCode).toBe("park50");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("includes API key in the request URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          total: "0",
          limit: "50",
          start: "0",
          data: [],
        }),
    });

    await fetchAllParksFromNpsApi("my-secret-key");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("api_key=my-secret-key"),
    );
  });

  it("throws on API error response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    await expect(fetchAllParksFromNpsApi("bad-key")).rejects.toThrow(
      "NPS API request failed: 401 Unauthorized",
    );
  });

  it("returns empty array when API reports total = 0", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          total: "0",
          limit: "50",
          start: "0",
          data: [],
        }),
    });

    const parks = await fetchAllParksFromNpsApi("test-key");
    expect(parks).toEqual([]);
  });

  it("uses correct pagination parameters", async () => {
    // Total of 60 parks → needs 2 pages with limit=50
    const page1Parks = Array.from({ length: 50 }, (_, i) => ({
      parkCode: `park${i}`,
    }));
    const page2Parks = Array.from({ length: 10 }, (_, i) => ({
      parkCode: `park${50 + i}`,
    }));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          total: "60",
          limit: "50",
          start: "0",
          data: page1Parks,
        }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          total: "60",
          limit: "50",
          start: "50",
          data: page2Parks,
        }),
    });

    const parks = await fetchAllParksFromNpsApi("test-key");

    expect(parks).toHaveLength(60);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Verify pagination URLs
    const firstUrl = mockFetch.mock.calls[0][0] as string;
    expect(firstUrl).toContain("start=0");
    expect(firstUrl).toContain("limit=50");

    const secondUrl = mockFetch.mock.calls[1][0] as string;
    expect(secondUrl).toContain("start=50");
  });
});
