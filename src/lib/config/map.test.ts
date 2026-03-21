import { describe, expect, it } from "vitest";
import {
  DEFAULT_UNIT_COLOR,
  getSimplificationTolerance,
  INITIAL_VIEW_STATE,
  MAP_STYLE_URL,
  UNIT_TYPE_COLORS,
} from "@/lib/config/map";

describe("getSimplificationTolerance", () => {
  it("returns highest tolerance for very low zoom (zoom <= 3)", () => {
    expect(getSimplificationTolerance(1)).toBe(0.05);
    expect(getSimplificationTolerance(2)).toBe(0.05);
    expect(getSimplificationTolerance(3)).toBe(0.05);
  });

  it("returns correct tolerance for zoom 4", () => {
    expect(getSimplificationTolerance(4)).toBe(0.02);
  });

  it("returns correct tolerance for zoom 5", () => {
    expect(getSimplificationTolerance(5)).toBe(0.01);
  });

  it("returns correct tolerance for zoom 6-7", () => {
    expect(getSimplificationTolerance(6)).toBe(0.005);
    expect(getSimplificationTolerance(7)).toBe(0.005);
  });

  it("returns correct tolerance for zoom 8-10", () => {
    expect(getSimplificationTolerance(8)).toBe(0.001);
    expect(getSimplificationTolerance(9)).toBe(0.001);
    expect(getSimplificationTolerance(10)).toBe(0.001);
  });

  it("returns correct tolerance for zoom 11-13", () => {
    expect(getSimplificationTolerance(11)).toBe(0.0005);
    expect(getSimplificationTolerance(12)).toBe(0.0005);
    expect(getSimplificationTolerance(13)).toBe(0.0005);
  });

  it("returns finest tolerance for zoom > 13", () => {
    expect(getSimplificationTolerance(14)).toBe(0.0001);
    expect(getSimplificationTolerance(18)).toBe(0.0001);
    expect(getSimplificationTolerance(22)).toBe(0.0001);
  });

  it("returns progressively finer tolerances as zoom increases", () => {
    const zooms = [2, 4, 5, 7, 10, 13, 16];
    const tolerances = zooms.map(getSimplificationTolerance);

    for (let i = 1; i < tolerances.length; i++) {
      expect(tolerances[i]).toBeLessThan(tolerances[i - 1]);
    }
  });

  it("always returns a positive number", () => {
    for (let zoom = 0; zoom <= 22; zoom++) {
      expect(getSimplificationTolerance(zoom)).toBeGreaterThan(0);
    }
  });
});

describe("INITIAL_VIEW_STATE", () => {
  it("centers on the continental US", () => {
    expect(INITIAL_VIEW_STATE.longitude).toBeCloseTo(-98.5, 1);
    expect(INITIAL_VIEW_STATE.latitude).toBeCloseTo(39.8, 1);
  });

  it("starts at a reasonable overview zoom level", () => {
    expect(INITIAL_VIEW_STATE.zoom).toBeGreaterThanOrEqual(3);
    expect(INITIAL_VIEW_STATE.zoom).toBeLessThanOrEqual(6);
  });
});

describe("MAP_STYLE_URL", () => {
  it("is a valid URL string", () => {
    expect(MAP_STYLE_URL).toMatch(/^https:\/\//);
  });
});

describe("UNIT_TYPE_COLORS", () => {
  it("provides colors for all major park types", () => {
    const expectedTypes = [
      "National Park",
      "National Monument",
      "National Historic Site",
      "National Historical Park",
      "National Recreation Area",
      "National Seashore",
      "National Preserve",
      "National Memorial",
      "National Military Park",
      "National Battlefield",
    ];

    for (const type of expectedTypes) {
      expect(UNIT_TYPE_COLORS[type]).toBeDefined();
    }
  });

  it("uses valid hex color codes", () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    for (const [, color] of Object.entries(UNIT_TYPE_COLORS)) {
      expect(color).toMatch(hexRegex);
    }
  });

  it("maps plural and singular forms to the same color", () => {
    expect(UNIT_TYPE_COLORS["National Park"]).toBe(
      UNIT_TYPE_COLORS["National Parks"],
    );
    expect(UNIT_TYPE_COLORS["National Monument"]).toBe(
      UNIT_TYPE_COLORS["National Monuments"],
    );
    expect(UNIT_TYPE_COLORS["National Historic Site"]).toBe(
      UNIT_TYPE_COLORS["National Historic Sites"],
    );
  });
});

describe("DEFAULT_UNIT_COLOR", () => {
  it("is a valid hex color code", () => {
    expect(DEFAULT_UNIT_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
