import { describe, expect, it } from "vitest";
import {
  COMBINED_PARK_CODES,
  NATIONAL_PARK_BOUNDARY_CODES,
  NATIONAL_PARK_CODES,
  NATIONAL_PARK_COUNT,
  NATIONAL_PARK_DESIGNATIONS,
} from "@/lib/constants/national-parks";

describe("NATIONAL_PARK_CODES", () => {
  it("contains 62 unique lowercase park codes", () => {
    expect(NATIONAL_PARK_CODES).toHaveLength(62);
  });

  it("contains all codes in lowercase", () => {
    for (const code of NATIONAL_PARK_CODES) {
      expect(code).toBe(code.toLowerCase());
    }
  });

  it("has no duplicate codes", () => {
    const unique = new Set(NATIONAL_PARK_CODES);
    expect(unique.size).toBe(NATIONAL_PARK_CODES.length);
  });

  it("includes well-known parks", () => {
    const wellKnown = ["yell", "yose", "grca", "zion", "glac", "grsm"];
    for (const code of wellKnown) {
      expect(NATIONAL_PARK_CODES).toContain(code);
    }
  });

  it("includes the combined seki code for Sequoia & Kings Canyon", () => {
    expect(NATIONAL_PARK_CODES).toContain("seki");
  });
});

describe("NATIONAL_PARK_BOUNDARY_CODES", () => {
  it("contains 63 unique uppercase boundary codes", () => {
    expect(NATIONAL_PARK_BOUNDARY_CODES.size).toBe(63);
  });

  it("has separate entries for Sequoia (SEQU) and Kings Canyon (KICA)", () => {
    expect(NATIONAL_PARK_BOUNDARY_CODES.has("SEQU")).toBe(true);
    expect(NATIONAL_PARK_BOUNDARY_CODES.has("KICA")).toBe(true);
  });

  it("all codes are uppercase", () => {
    for (const code of NATIONAL_PARK_BOUNDARY_CODES) {
      expect(code).toBe(code.toUpperCase());
    }
  });

  it("contains well-known parks in uppercase", () => {
    const wellKnown = ["YELL", "YOSE", "GRCA", "ZION", "GLAC", "GRSM"];
    for (const code of wellKnown) {
      expect(NATIONAL_PARK_BOUNDARY_CODES.has(code)).toBe(true);
    }
  });
});

describe("NATIONAL_PARK_COUNT", () => {
  it("equals 63 (official count)", () => {
    expect(NATIONAL_PARK_COUNT).toBe(63);
  });

  it("matches the boundary codes count", () => {
    expect(NATIONAL_PARK_COUNT).toBe(NATIONAL_PARK_BOUNDARY_CODES.size);
  });

  it("accounts for the seki → SEQU + KICA split", () => {
    // 62 unique park_details codes + 1 extra from seki split = 63
    expect(NATIONAL_PARK_CODES.length + 1).toBe(NATIONAL_PARK_COUNT);
  });
});

describe("COMBINED_PARK_CODES", () => {
  it("maps seki to Sequoia and Kings Canyon", () => {
    expect(COMBINED_PARK_CODES.seki).toEqual(["Sequoia", "Kings Canyon"]);
  });

  it("only contains seki as a combined code", () => {
    expect(Object.keys(COMBINED_PARK_CODES)).toEqual(["seki"]);
  });
});

describe("NATIONAL_PARK_DESIGNATIONS", () => {
  it("includes the standard National Park designation", () => {
    expect(NATIONAL_PARK_DESIGNATIONS).toContain("National Park");
  });

  it("includes variant designations", () => {
    expect(NATIONAL_PARK_DESIGNATIONS).toContain("National Park & Preserve");
    expect(NATIONAL_PARK_DESIGNATIONS).toContain("National and State Parks");
    expect(NATIONAL_PARK_DESIGNATIONS).toContain("National Parks");
  });

  it("has exactly 4 designation variants", () => {
    expect(NATIONAL_PARK_DESIGNATIONS).toHaveLength(4);
  });
});

describe("cross-referencing codes and boundaries", () => {
  it("every park code (except seki) has a matching uppercase boundary code", () => {
    for (const code of NATIONAL_PARK_CODES) {
      if (code === "seki") continue;
      expect(NATIONAL_PARK_BOUNDARY_CODES.has(code.toUpperCase())).toBe(true);
    }
  });

  it("seki maps to SEQU and KICA boundary codes (not SEKI)", () => {
    expect(NATIONAL_PARK_BOUNDARY_CODES.has("SEKI")).toBe(false);
    expect(NATIONAL_PARK_BOUNDARY_CODES.has("SEQU")).toBe(true);
    expect(NATIONAL_PARK_BOUNDARY_CODES.has("KICA")).toBe(true);
  });
});
