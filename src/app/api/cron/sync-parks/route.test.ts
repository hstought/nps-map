import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/nps-api", () => ({
  fetchAllParksFromNpsApi: vi.fn(),
}));

vi.mock("@/lib/data/parks", () => ({
  upsertParkDetails: vi.fn(),
}));

import { GET } from "@/app/api/cron/sync-parks/route";
import { fetchAllParksFromNpsApi } from "@/lib/data/nps-api";
import { upsertParkDetails } from "@/lib/data/parks";

const mockFetchAllParks = vi.mocked(fetchAllParksFromNpsApi);
const mockUpsertParkDetails = vi.mocked(upsertParkDetails);

function createRequest(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) {
    headers.set("authorization", authHeader);
  }
  return new Request("http://localhost:3000/api/cron/sync-parks", { headers });
}

describe("GET /api/cron/sync-parks", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = {
      ...originalEnv,
      CRON_SECRET: "test-secret",
      NPS_API_KEY: "test-api-key",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("syncs parks successfully with valid auth", async () => {
    const mockParks = [{ parkCode: "yell" }, { parkCode: "yose" }] as any[];
    mockFetchAllParks.mockResolvedValue(mockParks);
    mockUpsertParkDetails.mockResolvedValue({ synced: 2 });

    const response = await GET(createRequest("Bearer test-secret") as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Synced 2 parks");
    expect(body.timestamp).toBeDefined();
  });

  it("returns 401 with wrong CRON_SECRET", async () => {
    const response = await GET(createRequest("Bearer wrong-secret") as any);

    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("Unauthorized");
  });

  it("returns 401 with no auth header", async () => {
    const response = await GET(createRequest() as any);

    expect(response.status).toBe(401);
  });

  it("allows access when CRON_SECRET is not set", async () => {
    delete process.env.CRON_SECRET;
    mockFetchAllParks.mockResolvedValue([]);
    mockUpsertParkDetails.mockResolvedValue({ synced: 0 });

    const response = await GET(createRequest() as any);

    expect(response.status).toBe(200);
  });

  it("returns 500 when NPS_API_KEY is not configured", async () => {
    delete process.env.NPS_API_KEY;

    const response = await GET(createRequest("Bearer test-secret") as any);

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("NPS_API_KEY not configured");
  });

  it("returns 500 on sync failure", async () => {
    mockFetchAllParks.mockRejectedValue(new Error("API down"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET(createRequest("Bearer test-secret") as any);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Sync failed");
    expect(body.details).toContain("API down");
    consoleSpy.mockRestore();
  });

  it("passes API key to fetchAllParksFromNpsApi", async () => {
    mockFetchAllParks.mockResolvedValue([]);
    mockUpsertParkDetails.mockResolvedValue({ synced: 0 });

    await GET(createRequest("Bearer test-secret") as any);

    expect(mockFetchAllParks).toHaveBeenCalledWith("test-api-key");
  });

  it("passes fetched parks to upsertParkDetails", async () => {
    const parks = [{ parkCode: "yell" }] as any[];
    mockFetchAllParks.mockResolvedValue(parks);
    mockUpsertParkDetails.mockResolvedValue({ synced: 1 });

    await GET(createRequest("Bearer test-secret") as any);

    expect(mockUpsertParkDetails).toHaveBeenCalledWith(parks);
  });
});
