import type { ParkBoundaryCollection } from "@/types/park";

/** Static, pre-simplified boundaries for every park (see scripts/build-overview.ts). */
export const OVERVIEW_URL = "/data/parks-overview.geojson";

/**
 * Below this zoom the static overview is detailed enough on its own; at or
 * above it the map also requests detailed boundaries for the viewport.
 */
export const OVERVIEW_MAX_ZOOM = 8;

let overviewPromise: Promise<ParkBoundaryCollection> | null = null;

/**
 * Fetch the overview once and share the result. Call it as early as possible
 * so the download overlaps with MapLibre and map-style loading.
 */
export function loadOverview(): Promise<ParkBoundaryCollection> {
  if (!overviewPromise) {
    overviewPromise = fetch(OVERVIEW_URL)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load park overview");
        return response.json() as Promise<ParkBoundaryCollection>;
      })
      .catch((error) => {
        overviewPromise = null; // allow a retry on the next call
        throw error;
      });
  }
  return overviewPromise;
}
