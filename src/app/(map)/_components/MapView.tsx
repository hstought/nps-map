"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import type {
  FillLayerSpecification,
  LineLayerSpecification,
  ExpressionSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { INITIAL_VIEW_STATE, DEFAULT_UNIT_COLOR, UNIT_TYPE_COLORS } from "@/lib/config/map";
import type { ParkBoundaryCollection, ParkBoundaryProperties } from "@/types/park";
import type { MapStyleKey } from "@/types/map";
import { getStyleUrl } from "@/lib/config/map";
import { ParkDetailPopup } from "./ParkDetailPopup";
import { MapStyleSwitcher } from "./MapStyleSwitcher";

// Build the MapLibre match expression for fill-color based on unit type.
// Cast justified: the dynamic spread from UNIT_TYPE_COLORS produces string[]
// which TypeScript can't verify against MapLibre's match tuple shape.
const fillColorMatch = [
  "match",
  ["get", "unitType"],
  ...Object.entries(UNIT_TYPE_COLORS).flatMap(([type, color]) => [
    type,
    color,
  ]),
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
    2,
    1,
  ],
};

export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const [parkData, setParkData] = useState<ParkBoundaryCollection | null>(null);
  const [selectedPark, setSelectedPark] = useState<{
    unitCode: string;
    longitude: number;
    latitude: number;
  } | null>(null);
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null);
  const [currentStyle, setCurrentStyle] = useState<MapStyleKey>("liberty");
  const [isLoading, setIsLoading] = useState(false);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch park boundaries based on the current viewport
  const fetchParks = useCallback(async () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const bounds = map.getBounds();
    const zoom = map.getZoom();

    const bbox = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ].join(",");

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/parks?bbox=${bbox}&zoom=${Math.round(zoom)}`
      );
      if (!response.ok) throw new Error("Failed to fetch parks");
      const data: ParkBoundaryCollection = await response.json();
      setParkData(data);
    } catch (error) {
      console.error("Error fetching parks:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced fetch on viewport change
  const handleMoveEnd = useCallback(
    () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(fetchParks, 300);
    },
    [fetchParks]
  );

  // Initial data load
  useEffect(() => {
    // Small delay to ensure map is ready
    const timer = setTimeout(fetchParks, 500);
    return () => clearTimeout(timer);
  }, [fetchParks]);

  // Handle polygon click
  const handleClick = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature) {
      setSelectedPark(null);
      return;
    }

    const props = feature.properties as ParkBoundaryProperties;
    setSelectedPark({
      unitCode: props.unitCode,
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat,
    });
  }, []);

  // Handle polygon hover
  const handleMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      // Clear previous hover state
      if (hoveredFeatureId !== null) {
        map.setFeatureState(
          { source: "park-boundaries", id: hoveredFeatureId },
          { hover: false }
        );
      }

      const feature = event.features?.[0];
      if (feature && feature.id !== undefined) {
        const featureId = String(feature.id);
        map.setFeatureState(
          { source: "park-boundaries", id: featureId },
          { hover: true }
        );
        setHoveredFeatureId(featureId);
        map.getCanvas().style.cursor = "pointer";
      } else {
        setHoveredFeatureId(null);
        map.getCanvas().style.cursor = "";
      }
    },
    [hoveredFeatureId]
  );

  const handleMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (hoveredFeatureId !== null) {
      map.setFeatureState(
        { source: "park-boundaries", id: hoveredFeatureId },
        { hover: false }
      );
      setHoveredFeatureId(null);
    }
    map.getCanvas().style.cursor = "";
  }, [hoveredFeatureId]);

  // Resolve the current map style URL
  const styleUrl = getStyleUrl(currentStyle) || getStyleUrl("liberty")!;

  // Add feature IDs to GeoJSON for feature-state hover to work
  const dataWithIds = parkData
    ? {
        ...parkData,
        features: parkData.features.map((f, i) => ({
          ...f,
          id: i,
        })),
      }
    : null;

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        style={{ width: "100%", height: "100%" }}
        mapStyle={styleUrl}
        onMoveEnd={handleMoveEnd}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        interactiveLayerIds={["park-fill"]}
      >
        <NavigationControl position="top-left" />

        {dataWithIds && (
          <Source
            id="park-boundaries"
            type="geojson"
            data={dataWithIds}
            promoteId="unitCode"
            tolerance={0.375}
            buffer={256}
          >
            <Layer
              id="park-fill"
              type="fill"
              paint={fillPaint}
            />
            <Layer
              id="park-outline"
              type="line"
              paint={outlinePaint}
            />
          </Source>
        )}

        {selectedPark && (
          <Popup
            longitude={selectedPark.longitude}
            latitude={selectedPark.latitude}
            anchor="bottom"
            onClose={() => setSelectedPark(null)}
            closeOnClick={false}
            maxWidth="384px"
            className="park-popup"
          >
            <ParkDetailPopup
              unitCode={selectedPark.unitCode}
              onClose={() => setSelectedPark(null)}
            />
          </Popup>
        )}
      </Map>

      {/* Map style switcher */}
      <MapStyleSwitcher
        currentStyle={currentStyle}
        onStyleChange={setCurrentStyle}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-md backdrop-blur-sm">
          Loading parks…
        </div>
      )}
    </div>
  );
}
