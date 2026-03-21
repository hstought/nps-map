import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockNpsApiPark } from "@/test/fixtures";

// Mock the database module
const mockSql = vi.fn();
vi.mock("@/lib/db", () => ({
  getDb: () => mockSql,
}));

// Import after mocking
import {
  getParkBoundaries,
  getParkDetail,
  isMemoryError,
  searchParks,
  upsertParkDetails,
} from "@/lib/data/parks";

describe("isMemoryError", () => {
  it('returns true for Postgres error code "53200"', () => {
    const error = { code: "53200", message: "out of memory" };
    expect(isMemoryError(error)).toBe(true);
  });

  it("returns true for std::bad_alloc message", () => {
    const error = new Error("GEOS std::bad_alloc - out of memory");
    expect(isMemoryError(error)).toBe(true);
  });

  it('returns true for "out of memory" in message', () => {
    const error = new Error("Allocation failed: out of memory");
    expect(isMemoryError(error)).toBe(true);
  });

  it("returns true for TopologyException message", () => {
    const error = new Error("TopologyException: side location conflict");
    expect(isMemoryError(error)).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    const error = new Error("Connection refused");
    expect(isMemoryError(error)).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isMemoryError(null)).toBe(false);
    expect(isMemoryError(undefined)).toBe(false);
  });

  it("returns false for non-matching error code objects", () => {
    const error = { code: "42P01", message: "relation does not exist" };
    expect(isMemoryError(error)).toBe(false);
  });

  it("handles string errors via String() coercion", () => {
    expect(isMemoryError("bad_alloc in GEOS")).toBe(true);
    expect(isMemoryError("some random error")).toBe(false);
  });
});

describe("getParkBoundaries", () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  const bbox = { west: -111, south: 44, east: -110, north: 45 };

  it("returns a GeoJSON FeatureCollection", async () => {
    mockSql.mockResolvedValue([
      {
        unit_code: "YELL",
        unit_name: "Yellowstone",
        park_name: "Yellowstone",
        unit_type: "National Park",
        state: "WY",
        region: "Mountain",
        geojson: JSON.stringify({
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [-110, 44],
                [-110, 45],
                [-111, 45],
                [-110, 44],
              ],
            ],
          ],
        }),
      },
    ]);

    const result = await getParkBoundaries(bbox, 5);

    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(1);
    expect(result.features[0].type).toBe("Feature");
    expect(result.features[0].properties.unitCode).toBe("YELL");
    expect(result.features[0].properties.unitName).toBe("Yellowstone");
    expect(result.features[0].geometry.type).toBe("MultiPolygon");
  });

  it("returns empty features when no rows match", async () => {
    mockSql.mockResolvedValue([]);

    const result = await getParkBoundaries(bbox, 5);

    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(0);
  });

  it("falls back to ST_Simplify on memory error", async () => {
    // First call (ST_SimplifyPreserveTopology) → OOM
    mockSql.mockRejectedValueOnce(new Error("std::bad_alloc"));
    // Second call (ST_Simplify) → success
    mockSql.mockResolvedValueOnce([
      {
        unit_code: "YELL",
        unit_name: "Yellowstone",
        park_name: null,
        unit_type: "National Park",
        state: "WY",
        region: "Mountain",
        geojson: JSON.stringify({ type: "MultiPolygon", coordinates: [] }),
      },
    ]);

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await getParkBoundaries(bbox, 5);

    expect(result.features).toHaveLength(1);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("OOM"));
    consoleSpy.mockRestore();
  });

  it("falls back to aggressive tolerance on double memory error", async () => {
    // First and second calls → OOM
    mockSql.mockRejectedValueOnce(new Error("std::bad_alloc"));
    mockSql.mockRejectedValueOnce(new Error("out of memory"));
    // Third call (aggressive tolerance) → success
    mockSql.mockResolvedValueOnce([]);

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await getParkBoundaries(bbox, 5);

    expect(result.features).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });

  it("throws non-memory errors without retrying", async () => {
    mockSql.mockRejectedValue(new Error("Connection refused"));

    await expect(getParkBoundaries(bbox, 5)).rejects.toThrow(
      "Connection refused",
    );
  });

  it("maps multiple rows to features correctly", async () => {
    mockSql.mockResolvedValue([
      {
        unit_code: "YELL",
        unit_name: "Yellowstone",
        park_name: "Yellowstone NP",
        unit_type: "National Park",
        state: "WY",
        region: "Mountain",
        geojson: JSON.stringify({ type: "MultiPolygon", coordinates: [] }),
      },
      {
        unit_code: "GRTE",
        unit_name: "Grand Teton",
        park_name: null,
        unit_type: "National Park",
        state: "WY",
        region: "Mountain",
        geojson: JSON.stringify({ type: "MultiPolygon", coordinates: [] }),
      },
    ]);

    const result = await getParkBoundaries(bbox, 5);

    expect(result.features).toHaveLength(2);
    expect(result.features[0].properties.unitCode).toBe("YELL");
    expect(result.features[0].properties.parkName).toBe("Yellowstone NP");
    expect(result.features[1].properties.unitCode).toBe("GRTE");
    expect(result.features[1].properties.parkName).toBeNull();
  });
});

describe("getParkDetail", () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  it("returns park detail for a valid unit code", async () => {
    mockSql.mockResolvedValue([
      {
        unit_code: "YELL",
        unit_name: "Yellowstone",
        unit_type: "National Park",
        state: "WY",
        states: "WY,MT,ID",
        full_name: "Yellowstone National Park",
        description: "The first national park.",
        designation: "National Park",
        url: "https://www.nps.gov/yell",
        weather_info: "Cold winters",
        latitude: 44.6,
        longitude: -110.5,
        images: [
          {
            url: "photo.jpg",
            credit: "NPS",
            title: "Photo",
            altText: "Alt",
            caption: "Cap",
          },
        ],
        activities: [{ id: "1", name: "Hiking" }],
        topics: [{ id: "1", name: "Geysers" }],
        entrance_fees: [
          { cost: "35.00", description: "Desc", title: "Vehicle" },
        ],
        operating_hours: [
          {
            name: "General",
            description: "Year-round",
            standardHours: {},
            exceptions: [],
          },
        ],
        contacts: { phoneNumbers: [], emailAddresses: [] },
        directions_info: "From north...",
        directions_url: "https://www.nps.gov/yell/directions",
      },
    ]);

    const result = await getParkDetail("YELL");

    expect(result).not.toBeNull();
    expect(result?.unitCode).toBe("YELL");
    expect(result?.fullName).toBe("Yellowstone National Park");
    expect(result?.description).toBe("The first national park.");
    expect(result?.latitude).toBe(44.6);
    expect(result?.longitude).toBe(-110.5);
  });

  it("returns null when park is not found", async () => {
    mockSql.mockResolvedValue([]);

    const result = await getParkDetail("XXXX");
    expect(result).toBeNull();
  });

  it("falls back to unit_name when full_name is missing", async () => {
    mockSql.mockResolvedValue([
      {
        unit_code: "TEST",
        unit_name: "Test Unit",
        unit_type: "National Monument",
        state: "CA",
        states: null,
        full_name: null,
        description: null,
        designation: null,
        url: null,
        weather_info: null,
        latitude: null,
        longitude: null,
        images: null,
        activities: null,
        topics: null,
        entrance_fees: null,
        operating_hours: null,
        contacts: null,
        directions_info: null,
        directions_url: null,
      },
    ]);

    const result = await getParkDetail("TEST");

    expect(result?.fullName).toBe("Test Unit");
    expect(result?.designation).toBe("National Monument");
  });

  it("defaults arrays and contacts when null", async () => {
    mockSql.mockResolvedValue([
      {
        unit_code: "TEST",
        unit_name: "Test",
        unit_type: null,
        state: null,
        states: null,
        full_name: "Test Park",
        description: null,
        designation: null,
        url: null,
        weather_info: null,
        latitude: null,
        longitude: null,
        images: null,
        activities: null,
        topics: null,
        entrance_fees: null,
        operating_hours: null,
        contacts: null,
        directions_info: null,
        directions_url: null,
      },
    ]);

    const result = await getParkDetail("TEST");

    expect(result?.images).toEqual([]);
    expect(result?.activities).toEqual([]);
    expect(result?.topics).toEqual([]);
    expect(result?.entranceFees).toEqual([]);
    expect(result?.operatingHours).toEqual([]);
    expect(result?.contacts).toEqual({
      phoneNumbers: [],
      emailAddresses: [],
    });
  });
});

describe("searchParks", () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  it("returns matching parks", async () => {
    mockSql.mockResolvedValue([
      {
        unit_code: "YELL",
        unit_name: "Yellowstone National Park",
        unit_type: "National Park",
        state: "WY",
        latitude: 44.6,
        longitude: -110.5,
      },
    ]);

    const results = await searchParks("yellow");

    expect(results).toHaveLength(1);
    expect(results[0].unitCode).toBe("YELL");
    expect(results[0].unitName).toBe("Yellowstone National Park");
  });

  it("returns empty array when no matches", async () => {
    mockSql.mockResolvedValue([]);

    const results = await searchParks("xyznonexistent");
    expect(results).toEqual([]);
  });

  it("maps all fields correctly", async () => {
    mockSql.mockResolvedValue([
      {
        unit_code: "GRCA",
        unit_name: "Grand Canyon National Park",
        unit_type: "National Park",
        state: "AZ",
        latitude: 36.1,
        longitude: -112.1,
      },
    ]);

    const results = await searchParks("grand");

    expect(results[0]).toEqual({
      unitCode: "GRCA",
      unitName: "Grand Canyon National Park",
      unitType: "National Park",
      state: "AZ",
      latitude: 36.1,
      longitude: -112.1,
    });
  });
});

describe("upsertParkDetails", () => {
  beforeEach(() => {
    mockSql.mockReset();
    mockSql.mockResolvedValue([]);
  });

  it("returns the count of synced parks", async () => {
    const parks = [
      createMockNpsApiPark({ parkCode: "yell" }),
      createMockNpsApiPark({ parkCode: "yose" }),
    ];

    const result = await upsertParkDetails(parks);
    expect(result.synced).toBe(2);
  });

  it("calls sql for each park", async () => {
    const parks = [
      createMockNpsApiPark({ parkCode: "yell" }),
      createMockNpsApiPark({ parkCode: "yose" }),
      createMockNpsApiPark({ parkCode: "grca" }),
    ];

    await upsertParkDetails(parks);
    expect(mockSql).toHaveBeenCalledTimes(3);
  });

  it("returns zero when given an empty array", async () => {
    const result = await upsertParkDetails([]);
    expect(result.synced).toBe(0);
    expect(mockSql).not.toHaveBeenCalled();
  });
});
