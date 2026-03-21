import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockParkDetail } from "@/test/fixtures";

vi.mock("@/lib/data/parks", () => ({
  getParkDetail: vi.fn(),
}));

import { getParkDetail } from "@/lib/data/parks";
import { GET } from "@/app/api/parks/[code]/route";

const mockGetParkDetail = vi.mocked(getParkDetail);

function createRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/parks/YELL");
}

describe("GET /api/parks/[code]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns park detail for a valid code", async () => {
    const mockDetail = createMockParkDetail();
    mockGetParkDetail.mockResolvedValue(mockDetail);

    const response = await GET(createRequest(), {
      params: Promise.resolve({ code: "yell" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.unitCode).toBe("YELL");
    expect(body.fullName).toBe("Yellowstone National Park");
  });

  it("converts code to uppercase before lookup", async () => {
    mockGetParkDetail.mockResolvedValue(createMockParkDetail());

    await GET(createRequest(), {
      params: Promise.resolve({ code: "yell" }),
    });

    expect(mockGetParkDetail).toHaveBeenCalledWith("YELL");
  });

  it("returns 404 when park is not found", async () => {
    mockGetParkDetail.mockResolvedValue(null);

    const response = await GET(createRequest(), {
      params: Promise.resolve({ code: "XXXX" }),
    });

    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe("Park not found");
  });

  it("returns 400 for empty code", async () => {
    const response = await GET(createRequest(), {
      params: Promise.resolve({ code: "" }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Missing park code");
  });

  it("sets long-lived cache headers", async () => {
    mockGetParkDetail.mockResolvedValue(createMockParkDetail());

    const response = await GET(createRequest(), {
      params: Promise.resolve({ code: "yell" }),
    });

    expect(response.headers.get("Cache-Control")).toContain("max-age=3600");
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=86400");
  });

  it("returns 500 on unexpected error", async () => {
    mockGetParkDetail.mockRejectedValue(new Error("DB timeout"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET(createRequest(), {
      params: Promise.resolve({ code: "yell" }),
    });

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("Failed to fetch park detail");
    consoleSpy.mockRestore();
  });
});
