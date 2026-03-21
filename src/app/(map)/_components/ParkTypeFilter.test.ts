import { describe, expect, it } from "vitest";
import {
  buildAllEnabledTypes,
  isTypeEnabled,
} from "@/app/(map)/_components/ParkTypeFilter";
import { UNIT_TYPE_COLORS } from "@/lib/config/map";

describe("buildAllEnabledTypes", () => {
  it("includes all known unit type colors", () => {
    const enabled = buildAllEnabledTypes();

    for (const type of Object.keys(UNIT_TYPE_COLORS)) {
      expect(enabled.has(type)).toBe(true);
    }
  });

  it('includes the "__other__" type', () => {
    const enabled = buildAllEnabledTypes();
    expect(enabled.has("__other__")).toBe(true);
  });

  it("returns a new Set each time (no shared state)", () => {
    const a = buildAllEnabledTypes();
    const b = buildAllEnabledTypes();

    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe("isTypeEnabled", () => {
  const allEnabled = buildAllEnabledTypes();
  const noneEnabled = new Set<string>();

  describe("direct type matching", () => {
    it("returns true when unitType is in the enabled set", () => {
      const enabled = new Set(["National Park"]);
      expect(isTypeEnabled("National Park", "Yellowstone", enabled)).toBe(true);
    });

    it("returns false when unitType is not in the enabled set", () => {
      const enabled = new Set(["National Monument"]);
      expect(isTypeEnabled("National Park", "Yellowstone", enabled)).toBe(
        false,
      );
    });
  });

  describe("__other__ type handling", () => {
    it("returns true for null unitType when __other__ is enabled", () => {
      const enabled = new Set(["__other__"]);
      expect(isTypeEnabled(null, "Some Place", enabled)).toBe(true);
    });

    it("returns false for null unitType when __other__ is disabled", () => {
      expect(isTypeEnabled(null, "Some Place", noneEnabled)).toBe(false);
    });

    it("returns true for unknown unitType when __other__ is enabled", () => {
      const enabled = new Set(["__other__"]);
      expect(isTypeEnabled("Wild River", "Test River", enabled)).toBe(true);
    });

    it("returns false for unknown unitType when __other__ is disabled", () => {
      const enabled = new Set(["National Park"]);
      expect(isTypeEnabled("Wild River", "Test River", enabled)).toBe(false);
    });
  });

  describe("official national park override", () => {
    it("shows official national parks when National Park filter is on, regardless of boundary type", () => {
      const enabled = new Set(["National Park"]);
      // YELL is a known national park boundary code
      expect(
        isTypeEnabled("National Preserve", "Yellowstone", enabled, "YELL"),
      ).toBe(true);
    });

    it("shows parks via National Parks (plural) filter", () => {
      const enabled = new Set(["National Parks"]);
      expect(isTypeEnabled("Other Type", "Denali", enabled, "DENA")).toBe(true);
    });

    it("does not override for non-official park codes", () => {
      const enabled = new Set(["National Park"]);
      // ABCD is not a known boundary code
      expect(
        isTypeEnabled("National Preserve", "Some Preserve", enabled, "ABCD"),
      ).toBe(false);
    });

    it("is case-insensitive for unit codes", () => {
      const enabled = new Set(["National Park"]);
      expect(
        isTypeEnabled("National Preserve", "Yellowstone", enabled, "yell"),
      ).toBe(true);
    });
  });

  describe("dual-designation pattern matching", () => {
    it('matches "National Park & Preserve" with National Park filter', () => {
      const enabled = new Set(["National Park"]);
      expect(
        isTypeEnabled(
          "Other",
          "Wrangell-St. Elias National Park & Preserve",
          enabled,
        ),
      ).toBe(true);
    });

    it('matches "National Park and Preserve" with National Preserve filter', () => {
      const enabled = new Set(["National Preserve"]);
      expect(
        isTypeEnabled(
          "Other",
          "Gates of the Arctic National Park and Preserve",
          enabled,
        ),
      ).toBe(true);
    });

    it("does not match unrelated park names", () => {
      const enabled = new Set(["National Preserve"]);
      expect(isTypeEnabled("Other", "Acadia National Park", enabled)).toBe(
        false,
      );
    });
  });

  describe("with all types enabled", () => {
    it("returns true for any known type", () => {
      expect(isTypeEnabled("National Park", "Test Park", allEnabled)).toBe(
        true,
      );
      expect(isTypeEnabled("National Monument", "Test", allEnabled)).toBe(true);
      expect(isTypeEnabled("National Historic Site", "Test", allEnabled)).toBe(
        true,
      );
    });

    it("returns true for null/unknown types (via __other__)", () => {
      expect(isTypeEnabled(null, "Test", allEnabled)).toBe(true);
      expect(isTypeEnabled("National Scenic Trail", "Test", allEnabled)).toBe(
        true,
      );
    });
  });

  describe("with no types enabled", () => {
    it("returns false for any known type", () => {
      expect(isTypeEnabled("National Park", "Test", noneEnabled)).toBe(false);
    });

    it("returns false for null unitType", () => {
      expect(isTypeEnabled(null, "Test", noneEnabled)).toBe(false);
    });
  });
});
