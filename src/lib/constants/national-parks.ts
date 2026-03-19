/**
 * Canonical list of all 63 official U.S. National Parks.
 *
 * The NPS API uses varied designations (e.g., "National Park & Preserve",
 * "National and State Parks") for some parks that are officially counted
 * among the 63 National Parks. These constants are the source of truth for
 * filtering, derived from Wikipedia's list cross-referenced with NPS data.
 *
 * Two sets are provided:
 * - NATIONAL_PARK_CODES: lowercase park_details codes (62 unique — seki covers both Sequoia & Kings Canyon)
 * - NATIONAL_PARK_BOUNDARY_CODES: uppercase park_boundaries unit codes (63 entries — SEQU + KICA)
 *
 * @see docs/national-parks-comparison.md
 */

/**
 * Lowercase park codes matching the `park_details` table.
 * 62 unique codes — Sequoia & Kings Canyon share "seki".
 */
export const NATIONAL_PARK_CODES = [
  "acad",
  "npsa",
  "arch",
  "badl",
  "bibe",
  "bisc",
  "blca",
  "brca",
  "cany",
  "care",
  "cave",
  "chis",
  "cong",
  "crla",
  "cuva",
  "deva",
  "dena",
  "drto",
  "ever",
  "gaar",
  "jeff",
  "glac",
  "glba",
  "grca",
  "grte",
  "grba",
  "grsa",
  "grsm",
  "gumo",
  "hale",
  "havo",
  "hosp",
  "indu",
  "isro",
  "jotr",
  "katm",
  "kefj",
  "kova",
  "lacl",
  "lavo",
  "maca",
  "meve",
  "mora",
  "neri",
  "noca",
  "olym",
  "pefo",
  "pinn",
  "redw",
  "romo",
  "sagu",
  "seki",
  "shen",
  "thro",
  "viis",
  "voya",
  "whsa",
  "wica",
  "wrst",
  "yell",
  "yose",
  "zion",
] as const;

export type NationalParkCode = (typeof NATIONAL_PARK_CODES)[number];

/**
 * Uppercase unit codes matching the `park_boundaries` table.
 * 63 entries — Sequoia (SEQU) and Kings Canyon (KICA) have separate
 * boundary records but share one NPS record (seki).
 */
export const NATIONAL_PARK_BOUNDARY_CODES = new Set([
  "ACAD",
  "NPSA",
  "ARCH",
  "BADL",
  "BIBE",
  "BISC",
  "BLCA",
  "BRCA",
  "CANY",
  "CARE",
  "CAVE",
  "CHIS",
  "CONG",
  "CRLA",
  "CUVA",
  "DEVA",
  "DENA",
  "DRTO",
  "EVER",
  "GAAR",
  "JEFF",
  "GLAC",
  "GLBA",
  "GRCA",
  "GRTE",
  "GRBA",
  "GRSA",
  "GRSM",
  "GUMO",
  "HALE",
  "HAVO",
  "HOSP",
  "INDU",
  "ISRO",
  "JOTR",
  "KATM",
  "KEFJ",
  "KICA",
  "KOVA",
  "LACL",
  "LAVO",
  "MACA",
  "MEVE",
  "MORA",
  "NERI",
  "NOCA",
  "OLYM",
  "PEFO",
  "PINN",
  "REDW",
  "ROMO",
  "SAGU",
  "SEQU",
  "SHEN",
  "THRO",
  "VIIS",
  "VOYA",
  "WHSA",
  "WICA",
  "WRST",
  "YELL",
  "YOSE",
  "ZION",
]);

/** Total count per Wikipedia (seki counts as 2: Sequoia + Kings Canyon) */
export const NATIONAL_PARK_COUNT = 63;

/** Park codes where one code represents multiple parks */
export const COMBINED_PARK_CODES: Record<string, string[]> = {
  seki: ["Sequoia", "Kings Canyon"],
};

/**
 * NPS API designations that should be treated as "National Park" for filtering.
 * Used when syncing data to identify which parks belong to the 63 official parks.
 */
export const NATIONAL_PARK_DESIGNATIONS = [
  "National Park",
  "National Parks",
  "National Park & Preserve",
  "National and State Parks",
] as const;
