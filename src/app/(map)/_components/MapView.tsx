"use client";

import type {
  ExpressionSpecification,
  FillLayerSpecification,
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

export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [overview, setOverview] = useState<ParkBoundaryCollection | null>(null);
  const [detail, setDetail] = useState<ParkBoundaryCollection | null>(null);
  const [selectedPark, setSelectedPark] = useState<{
    unitCode: string;
    longitude: number;
    latitude: number;
  } | null>(null);
  const hoveredFeatureIdRef = useRef<string | null>(null);
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

    // Drop any in-flight request so a slow, older response can't overwrite
    // the current viewport.
    detailAbortRef.current?.abort();
    const controller = new AbortController();
    detailAbortRef.current = controller;

    setIsDetailLoading(true);
    try {
      const response = await fetch(`/api/parks?bbox=${bbox}&zoom=${zoom}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Failed to fetch parks");
      const data: ParkBoundaryCollection = await response.json();
      if (!controller.signal.aborted) setDetail(data);
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

  const setHovered = useCallback((featureId: string | null) => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const previous = hoveredFeatureIdRef.current;
    if (previous === featureId) return;

    if (previous !== null) {
      map.setFeatureState(
        { source: "park-boundaries", id: previous },
        { hover: false },
      );
    }
    if (featureId !== null) {
      map.setFeatureState(
        { source: "park-boundaries", id: featureId },
        { hover: true },
      );
    }
    hoveredFeatureIdRef.current = featureId;
    map.getCanvas().style.cursor = featureId !== null ? "pointer" : "";
  }, []);

  // Handle polygon hover (ref-based: no React re-render per mouse move)
  const handleMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      setHovered(
        feature && feature.id !== undefined ? String(feature.id) : null,
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

  // Overview features, with detailed geometry swapped in where we have it,
  // filtered by the enabled park types.
  const mapData = useMemo<ParkBoundaryCollection | null>(() => {
    if (!overview && !detail) return null;

    const byCode = new Map<string, ParkBoundaryFeature>();
    for (const f of overview?.features ?? []) {
      byCode.set(f.properties.unitCode, f);
    }
    for (const f of detail?.features ?? []) {
      byCode.set(f.properties.unitCode, f);
    }

    return {
      type: "FeatureCollection",
      features: Array.from(byCode.values()).filter((f) =>
        isTypeEnabled(
          f.properties.unitType,
          f.properties.unitName,
          enabledTypes,
          f.properties.unitCode,
        ),
      ),
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
        interactiveLayerIds={["park-fill"]}
      >
        <NavigationControl position="bottom-right" />

        {mapData && (
          <Source
            id="park-boundaries"
            type="geojson"
            data={mapData}
            promoteId="unitCode"
            tolerance={0.375}
            buffer={256}
          >
            <Layer id="park-fill" type="fill" paint={fillPaint} />
            <Layer id="park-outline" type="line" paint={outlinePaint} />
          </Source>
        )}

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
