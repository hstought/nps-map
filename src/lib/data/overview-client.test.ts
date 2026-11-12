import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

async function freshModule() {
  vi.resetModules();
  return import("@/lib/data/overview-client");
}

describe("loadOverview", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("fetches the static overview once and shares the result", async () => {
    const data = { type: "FeatureCollection", features: [] };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    });
    const { loadOverview, OVERVIEW_URL } = await freshModule();

    const [a, b] = await Promise.all([loadOverview(), loadOverview()]);

    expect(a).toBe(data);
    expect(b).toBe(data);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(OVERVIEW_URL);
  });

  it("retries on the next call after a failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ type: "FeatureCollection", features: [] }),
    });
    const { loadOverview } = await freshModule();

    await expect(loadOverview()).rejects.toThrow("park overview");
    await expect(loadOverview()).resolves.toMatchObject({
      type: "FeatureCollection",
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
