"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UNIT_TYPE_COLORS, DEFAULT_UNIT_COLOR } from "@/lib/config/map";
import { NATIONAL_PARK_BOUNDARY_CODES } from "@/lib/constants/national-parks";

/**
 * Canonical park-type groups used in the filter UI.
 * Each entry maps a display label → its color, matching unitType strings,
 * and a hardcoded total count of parks in that group across the full dataset.
 */
const PARK_TYPE_GROUPS: { label: string; color: string; types: string[]; count: number }[] = [
  { label: "National Park", color: "#2D6A4F", types: ["National Park", "National Parks"], count: 63 },
  { label: "National Monument", color: "#D4A843", types: ["National Monument", "National Monuments", "National Monument & Preserve"], count: 87 },
  { label: "National Historic Site", color: "#8B4513", types: ["National Historic Site", "National Historic Sites", "National Historical Park", "National Historical Parks"], count: 140 },
  { label: "National Recreation Area", color: "#4A90D9", types: ["National Recreation Area", "National Recreation Areas"], count: 18 },
  { label: "National Seashore / Lakeshore", color: "#1B98C4", types: ["National Seashore", "National Seashores", "National Lakeshore", "National Lakeshores"], count: 13 },
  { label: "National Preserve", color: "#5B8C5A", types: ["National Preserve", "National Preserves"], count: 13 },
  { label: "National Memorial", color: "#9B59B6", types: ["National Memorial", "National Memorials"], count: 31 },
  { label: "National Military Park / Battlefield", color: "#C0392B", types: ["National Military Park", "National Military Parks", "National Battlefield", "National Battlefields"], count: 20 },
  { label: "Other", color: DEFAULT_UNIT_COLOR, types: [], count: 46 },
];

/** Set of all explicitly-mapped unitType strings (used to classify "Other") */
const KNOWN_TYPES = new Set(
  Object.keys(UNIT_TYPE_COLORS)
);

interface ParkTypeFilterProps {
  /** Currently-enabled unit type strings (all values from UNIT_TYPE_COLORS + "__other__") */
  enabledTypes: Set<string>;
  onToggleGroup: (types: string[], enabled: boolean) => void;
}

export function ParkTypeFilter({ enabledTypes, onToggleGroup }: ParkTypeFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const isGroupEnabled = useCallback(
    (group: (typeof PARK_TYPE_GROUPS)[number]) => {
      if (group.label === "Other") return enabledTypes.has("__other__");
      return group.types.every((t) => enabledTypes.has(t));
    },
    [enabledTypes]
  );

  const allEnabled = PARK_TYPE_GROUPS.every((g) => isGroupEnabled(g));
  const noneEnabled = PARK_TYPE_GROUPS.every((g) => !isGroupEnabled(g));

  // Sum hardcoded counts for all enabled groups
  const selectedCount = PARK_TYPE_GROUPS.reduce(
    (sum, g) => (isGroupEnabled(g) ? sum + g.count : sum),
    0
  );

  const handleSelectAll = useCallback(() => {
    const allTypes = PARK_TYPE_GROUPS.flatMap((g) =>
      g.label === "Other" ? ["__other__"] : g.types
    );
    onToggleGroup(allTypes, true);
  }, [onToggleGroup]);

  const handleUnselectAll = useCallback(() => {
    const allTypes = PARK_TYPE_GROUPS.flatMap((g) =>
      g.label === "Other" ? ["__other__"] : g.types
    );
    onToggleGroup(allTypes, false);
  }, [onToggleGroup]);

  return (
    <div ref={containerRef} className="absolute top-4 left-4 z-10">
      {/* Filter toggle button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Filter park types"
        className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-md transition-colors hover:bg-gray-50 ${
          !allEnabled ? "ring-2 ring-green-600" : ""
        }`}
      >
        {/* Funnel / filter icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 text-gray-700"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="mt-2 w-64 rounded-lg bg-white p-3 shadow-lg ring-1 ring-black/5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Park Types
            </p>
            <button
              type="button"
              onClick={allEnabled ? handleUnselectAll : handleSelectAll}
              className="text-xs font-medium text-green-700 hover:text-green-900 transition-colors"
            >
              {allEnabled ? "Unselect All" : "Select All"}
            </button>
          </div>

          <ul className="flex flex-col gap-1">
            {PARK_TYPE_GROUPS.map((group) => {
              const checked = isGroupEnabled(group);
              const toggleTypes =
                group.label === "Other" ? ["__other__"] : group.types;

              return (
                <li key={group.label}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleGroup(toggleTypes, !checked)}
                      className="h-4 w-4 rounded border-gray-300 text-green-700 accent-green-700"
                    />
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: group.color }}
                    />
                    {group.label}
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-2 border-t border-gray-100 pt-2">
            <p className="text-center text-xs text-gray-500">
              {selectedCount} {selectedCount === 1 ? "park" : "parks"} selected
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Build the default "all enabled" set */
export function buildAllEnabledTypes(): Set<string> {
  const set = new Set<string>();
  for (const key of Object.keys(UNIT_TYPE_COLORS)) {
    set.add(key);
  }
  set.add("__other__");
  return set;
}



/**
 * Regex patterns that indicate a park belongs to multiple filter groups.
 * Used to show dual-designation parks (e.g. "National Park and Preserve")
 * when either of their parent groups is enabled.
 */
const DUAL_DESIGNATION_PATTERNS: { pattern: RegExp; extraTypes: string[] }[] = [
  // "X National Park & Preserve" / "X National Park and Preserve" → also match National Parks group
  { pattern: /national park (?:&|and) preserve/i, extraTypes: ["National Park", "National Parks"] },
  // "X National Park & Preserve" / "X National Park and Preserve" → also match National Preserves group
  { pattern: /national park (?:&|and) preserve/i, extraTypes: ["National Preserve", "National Preserves"] },
];

/** Returns true when a park should be shown given the current filter. */
export function isTypeEnabled(
  unitType: string | null,
  unitName: string | null,
  enabledTypes: Set<string>,
  unitCode?: string | null
): boolean {
  // Direct match on unitType
  if (unitType && KNOWN_TYPES.has(unitType) && enabledTypes.has(unitType)) return true;
  if (!unitType && enabledTypes.has("__other__")) return true;
  if (unitType && !KNOWN_TYPES.has(unitType) && enabledTypes.has("__other__")) return true;

  // If the National Park filter is on, include all 63 official national parks
  // regardless of their boundary unit_type (handles parks typed as Preserves etc.)
  if (
    unitCode &&
    NATIONAL_PARK_BOUNDARY_CODES.has(unitCode.toUpperCase()) &&
    (enabledTypes.has("National Park") || enabledTypes.has("National Parks"))
  ) {
    return true;
  }

  // Check dual-designation by park name
  if (unitName) {
    for (const { pattern, extraTypes } of DUAL_DESIGNATION_PATTERNS) {
      if (pattern.test(unitName) && extraTypes.some((t) => enabledTypes.has(t))) {
        return true;
      }
    }
  }

  return false;
}
