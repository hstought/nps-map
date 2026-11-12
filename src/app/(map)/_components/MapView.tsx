"use client";

import type {
  ExpressionSpecification,
  FillLayerSpecification,
  FilterSpecification,
  LineLayerSpecification,
} from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, {
  Layer,
  type MapLayerMouseEvent,
  type MapRef,
  NavigationControl,
  Popup,
  Source,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  DEFAULT_UNIT_COLOR,
  INITIAL_VIEW_STATE,
  MAP_STYLE_URL,
  UNIT_TYPE_COLORS,
} from "@/lib/config/map";
import { loadOverview, OVERVIEW_MAX_ZOOM } from "@/lib/data/overview-client";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import type {
  ParkBoundaryCollection,
  ParkBoundaryFeature,
  ParkBoundaryProperties,
  ParkSearchResult,
} from "@/types/park";
import { ParkDetailPopup } from "./ParkDetailPopup";
import { ParkSearch } from "./ParkSearch";
import {
  buildAllEnabledTypes,
  isTypeEnabled,
  ParkTypeFilter,
} from "./ParkTypeFilter";

// Build the MapLibre match expression for fill-color based on unit type.
// Cast justified: the dynamic spread from UNIT_TYPE_COLORS produces string[]
// which TypeScript can't verify against MapLibre's match tuple shape.
const fillColorMatch = [
  "match",
  ["get", "unitType"],
  ...Object.entries(UNIT_TYPE_COLORS).flat(),
  DEFAULT_UNIT_COLOR,
] as unknown as ExpressionSpecification;

const fillPaint: FillLayerSpecification["paint"] = {
  "fill-color": fillColorMatch,
  "fill-opacity": [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    0.55,
    0.3,
  ],
};

const outlinePaint: LineLayerSpecification["paint"] = {
  "line-color": [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    "#ffffff",
    "rgba(0,0,0,0.6)",
  ],
  "line-width": [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    2.5,
    1,
  ],
};

const SELECTED_PARK_FLY_DURATION_MS = 850;
/** Desktop popup card: image height + popup tip, in px (see ParkDetailPopup). */
const POPUP_IMAGE_HEIGHT_PX = 176;
const POPUP_TIP_PX = 16;
/** Mobile: share of the viewport the bottom sheet may cover. */
const SHEET_MAX_HEIGHT_FRACTION = 0.7;
const MOBILE_QUERY = "(max-width: 639px)";

/**
 * Snap the viewport outward to a coarse grid so nearby views produce the
 * same URL and can be served from the CDN cache.
 */
function snapBbox(
  west: number,
  south: number,
  east: number,
  north: number,
  zoom: number,
): string {
  const step = zoom >= 12 ? 0.05 : 0.25;
  const down = (v: number) => Math.floor(v / step) * step;
  const up = (v: number) => Math.ceil(v / step) * step;
  return [
    Math.max(-180, down(west)),
    Math.max(-90, down(south)),
    Math.min(180, up(east)),
    Math.min(90, up(north)),
  ]
    .map((v) => Number(v.toFixed(2)))
    .join(",");
}

const EMPTY_COLLECTION: ParkBoundaryCollection = {
  type: "FeatureCollection",
  features: [],
};

/** Layer filter: only features whose unitCode is in `codes`. */
function codeFilter(codes: string[]): FilterSpecification {
  return ["in", ["get", "unitCode"], ["literal", codes]];
}

export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [overview, setOverview] = useState<ParkBoundaryCollection | null>(null);
  // Detailed boundaries only ever accumulate and get finer: each park keeps
  // the highest-zoom geometry fetched so far. Zooming back out or panning
  // over loaded areas therefore never touches the map source, which is what
  // keeps zooming smooth.
  const detailByCodeRef = useRef(
    new Map<string, { feature: ParkBoundaryFeature; zoom: number }>(),
  );
  const fetchedUrlsRef = useRef(new Set<string>());
  const [detail, setDetail] =
    useState<ParkBoundaryCollection>(EMPTY_COLLECTION);
  const [selectedPark, setSelectedPark] = useState<{
    unitCode: string;
    longitude: number;
    latitude: number;
  } | null>(null);
  const hoveredRef = useRef<{ source: string; id: string } | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enabledTypes, setEnabledTypes] =
    useState<Set<string>>(buildAllEnabledTypes);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);

  // Overview: one static file with every park, already downloading since
  // MapContainer loaded.
  useEffect(() => {
    let cancelled = false;
    loadOverview()
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((error) => {
        console.error("Error loading park overview:", error);
        if (!cancelled) setLoadError("Couldn't load parks. Please refresh.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Detailed boundaries for the current viewport, only when zoomed in.
  const fetchDetail = useCallback(async () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const zoom = Math.round(map.getZoom());
    if (zoom < OVERVIEW_MAX_ZOOM) return;

    const bounds = map.getBounds();
    const bbox = snapBbox(
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
      zoom,
    );

    const url = `/api/parks?bbox=${bbox}&zoom=${zoom}`;
    if (fetchedUrlsRef.current.has(url)) return; // already have this view

    // Drop any in-flight request; its view is no longer on screen.
    detailAbortRef.current?.abort();
    const controller = new AbortController();
    detailAbortRef.current = controller;

    setIsDetailLoading(true);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Failed to fetch parks");
      const data: ParkBoundaryCollection = await response.json();
      if (controller.signal.aborted) return;
      fetchedUrlsRef.current.add(url);

      const byCode = detailByCodeRef.current;
      let changed = false;
      for (const feature of data.features) {
        const code = feature.properties.unitCode;
        const existing = byCode.get(code);
        if (!existing || existing.zoom < zoom) {
          byCode.set(code, { feature, zoom });
          changed = true;
        }
      }
      // Only touch the map source when something actually got more detailed.
      if (changed) {
        setDetail({
          type: "FeatureCollection",
          features: Array.from(byCode.values(), (entry) => entry.feature),
        });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error("Error fetching park details:", error);
      }
    } finally {
      if (detailAbortRef.current === controller) setIsDetailLoading(false);
    }
  }, []);

  // Debounced fetch on viewport change
  const handleMoveEnd = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(fetchDetail, 300);
  }, [fetchDetail]);

  useEffect(
    () => () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      detailAbortRef.current?.abort();
    },
    [],
  );

  const flyToPark = useCallback(
    (longitude: number, latitude: number, zoom?: number) => {
      // Mobile: park sits in the strip of map left visible above the bottom
      // sheet. Desktop: park sits low enough that the tallest possible popup
      // card (it's anchored above the park) is centred and fully on screen.
      const h = window.innerHeight;
      const cardMaxHeight =
        POPUP_IMAGE_HEIGHT_PX +
        Math.min(0.55 * h, h - 288) + // matches the card's scroll-body max-h
        POPUP_TIP_PX;
      const offsetY = isMobile
        ? -(h * SHEET_MAX_HEIGHT_FRACTION) / 2
        : Math.min(h / 2 - 48, cardMaxHeight / 2 + 8);
      const options = {
        center: [longitude, latitude] as [number, number],
        offset: [0, offsetY] as [number, number],
        duration: SELECTED_PARK_FLY_DURATION_MS,
        essential: true,
      };
      if (zoom === undefined) mapRef.current?.easeTo(options);
      else mapRef.current?.flyTo({ ...options, zoom });
    },
    [isMobile],
  );

  // Handle polygon click
  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) {
        setSelectedPark(null);
        return;
      }

      const props = feature.properties as ParkBoundaryProperties;
      flyToPark(event.lngLat.lng, event.lngLat.lat);
      setSelectedPark({
        unitCode: props.unitCode,
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
      });
    },
    [flyToPark],
  );

  const setHovered = useCallback(
    (next: { source: string; id: string } | null) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const previous = hoveredRef.current;
      if (previous?.source === next?.source && previous?.id === next?.id) {
        return;
      }

      if (previous) map.setFeatureState(previous, { hover: false });
      if (next) map.setFeatureState(next, { hover: true });
      hoveredRef.current = next;
      map.getCanvas().style.cursor = next ? "pointer" : "";
    },
    [],
  );

  // Handle polygon hover (ref-based: no React re-render per mouse move)
  const handleMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      setHovered(
        feature && feature.id !== undefined
          ? { source: feature.source, id: String(feature.id) }
          : null,
      );
    },
    [setHovered],
  );

  const handleMouseLeave = useCallback(() => setHovered(null), [setHovered]);

  // Toggle an entire type group on/off
  const handleToggleGroup = useCallback((types: string[], enabled: boolean) => {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      for (const t of types) {
        if (enabled) next.add(t);
        else next.delete(t);
      }
      return next;
    });
  }, []);

  // Handle park selection from search
  const handleParkSearchSelect = useCallback(
    (park: ParkSearchResult) => {
      if (park.latitude == null || park.longitude == null) return;

      flyToPark(park.longitude, park.latitude, 10);
      setSelectedPark({
        unitCode: park.unitCode,
        longitude: park.longitude,
        latitude: park.latitude,
      });
    },
    [flyToPark],
  );

  const closePark = useCallback(() => setSelectedPark(null), []);

  // Escape closes the park card
  useEffect(() => {
    if (!selectedPark) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePark();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedPark, closePark]);

  // Park-type filtering and the overview/detail hand-off are done with layer
  // filters rather than by rebuilding source data, so the GeoJSON is never
  // re-indexed while the user zooms or toggles filters.
  const { overviewFilter, detailFilter } = useMemo(() => {
    const enabled = new Set<string>();
    for (const f of [...(overview?.features ?? []), ...detail.features]) {
      const p = f.properties;
      if (isTypeEnabled(p.unitType, p.unitName, enabledTypes, p.unitCode)) {
        enabled.add(p.unitCode);
      }
    }
    const detailCodes = new Set(
      detail.features.map((f) => f.properties.unitCode),
    );
    return {
      // Hide the coarse outline wherever a detailed one is available.
      overviewFilter: codeFilter(
        Array.from(enabled).filter((code) => !detailCodes.has(code)),
      ),
      detailFilter: codeFilter(Array.from(enabled)),
    };
  }, [overview, detail, enabledTypes]);

  const parkCard = selectedPark && (
    <ParkDetailPopup
      key={selectedPark.unitCode}
      unitCode={selectedPark.unitCode}
      onClose={closePark}
      variant={isMobile ? "sheet" : "popup"}
    />
  );

  const isLoading = (!overview && !loadError) || isDetailLoading;

  return (
    <div className="relative h-full w-full">
      <MapGL
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE_URL}
        onMoveEnd={handleMoveEnd}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        interactiveLayerIds={["park-fill", "park-detail-fill"]}
      >
        <NavigationControl position="bottom-right" />

        {overview && (
          <Source
            id="park-overview"
            type="geojson"
            data={overview}
            promoteId="unitCode"
            tolerance={0.375}
            buffer={256}
          >
            <Layer
              id="park-fill"
              type="fill"
              paint={fillPaint}
              filter={overviewFilter}
            />
            <Layer
              id="park-outline"
              type="line"
              paint={outlinePaint}
              filter={overviewFilter}
            />
          </Source>
        )}

        <Source
          id="park-detail"
          type="geojson"
          data={detail}
          promoteId="unitCode"
          tolerance={0.375}
          buffer={256}
        >
          <Layer
            id="park-detail-fill"
            type="fill"
            paint={fillPaint}
            filter={detailFilter}
          />
          <Layer
            id="park-detail-outline"
            type="line"
            paint={outlinePaint}
            filter={detailFilter}
          />
        </Source>

        {selectedPark && !isMobile && (
          <Popup
            longitude={selectedPark.longitude}
            latitude={selectedPark.latitude}
            anchor="bottom"
            onClose={closePark}
            closeButton={false}
            closeOnClick={false}
            maxWidth="384px"
            className="park-popup"
          >
            {parkCard}
          </Popup>
        )}
      </MapGL>

      {/* Mobile: park details as a bottom sheet instead of a map popup */}
      {selectedPark && isMobile && (
        <div
          role="dialog"
          aria-label="Park details"
          className="absolute inset-x-0 bottom-0 z-20 overflow-hidden rounded-t-2xl bg-white shadow-[0_-8px_30px_rgb(0_0_0/0.2)]"
          style={{ maxHeight: `${SHEET_MAX_HEIGHT_FRACTION * 100}dvh` }}
        >
          {parkCard}
        </div>
      )}

      {/* Top-left controls: filter + search */}
      <div className="absolute top-4 left-4 z-10 flex items-start gap-2">
        <ParkTypeFilter
          enabledTypes={enabledTypes}
          onToggleGroup={handleToggleGroup}
        />
        <ParkSearch onSelectPark={handleParkSearchSelect} />
      </div>

      {/* Loading / error indicator */}
      {(isLoading || loadError) && (
        <div
          className={`absolute top-18 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium shadow-md backdrop-blur-sm sm:top-4 ${
            loadError ? "text-red-600" : "text-gray-700"
          }`}
        >
          {loadError ?? "Loading parks…"}
        </div>
      )}
    </div>
  );
}
