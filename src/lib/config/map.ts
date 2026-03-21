import type { ViewState } from "@/types/map";

export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export const INITIAL_VIEW_STATE: ViewState = {
  longitude: -98.5,
  latitude: 39.8,
  zoom: 4,
};

/**
 * Returns the simplification tolerance for a given zoom level.
 * Lower zoom = more simplification to reduce payload size.
 * Uses ST_SimplifyPreserveTopology-safe values — tighter than the old
 * ST_Simplify tolerances to keep more boundary detail at every zoom level.
 */
export function getSimplificationTolerance(zoom: number): number {
  if (zoom <= 3) return 0.05;
  if (zoom <= 4) return 0.02;
  if (zoom <= 5) return 0.01;
  if (zoom <= 7) return 0.005;
  if (zoom <= 10) return 0.001;
  if (zoom <= 13) return 0.0005;
  return 0.0001;
}

/**
 * Color scheme for park polygons by unit type.
 */
export const UNIT_TYPE_COLORS: Record<string, string> = {
  "National Park": "#2D6A4F",
  "National Parks": "#2D6A4F",
  "National Park & Preserve": "#2D6A4F",
  "National and State Parks": "#2D6A4F",
  "National Monument": "#D4A843",
  "National Monuments": "#D4A843",
  "National Monument & Preserve": "#D4A843",
  "National Historic Site": "#8B4513",
  "National Historic Sites": "#8B4513",
  "National Historical Park": "#8B4513",
  "National Historical Parks": "#8B4513",
  "National Recreation Area": "#4A90D9",
  "National Recreation Areas": "#4A90D9",
  "National Seashore": "#1B98C4",
  "National Seashores": "#1B98C4",
  "National Lakeshore": "#1B98C4",
  "National Lakeshores": "#1B98C4",
  "National Preserve": "#5B8C5A",
  "National Preserves": "#5B8C5A",
  "National Memorial": "#9B59B6",
  "National Memorials": "#9B59B6",
  "National Military Park": "#C0392B",
  "National Military Parks": "#C0392B",
  "National Battlefield": "#C0392B",
  "National Battlefields": "#C0392B",
};

export const DEFAULT_UNIT_COLOR = "#6B7280";
