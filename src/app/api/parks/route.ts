import { type NextRequest, NextResponse } from "next/server";
import { getParkBoundaries, isMemoryError } from "@/lib/data/parks";

/** At or below this zoom any bbox is allowed; each zoom above halves it. */
const MAX_SPAN_BASE_ZOOM = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const bboxParam = searchParams.get("bbox");
  const zoomParam = searchParams.get("zoom");

  if (!bboxParam || !zoomParam) {
    return NextResponse.json(
      { error: "Missing required parameters: bbox, zoom" },
      { status: 400 },
    );
  }

  const [west, south, east, north] = bboxParam.split(",").map(Number);

  if ([west, south, east, north].some(Number.isNaN)) {
    return NextResponse.json(
      { error: "Invalid bbox format. Expected: west,south,east,north" },
      { status: 400 },
    );
  }

  const rawZoom = parseFloat(zoomParam);

  if (!Number.isFinite(rawZoom)) {
    return NextResponse.json({ error: "Invalid zoom value" }, { status: 400 });
  }

  const zoom = clamp(Math.round(rawZoom), 0, 22);
  const bbox = {
    west: clamp(west, -180, 180),
    south: clamp(south, -90, 90),
    east: clamp(east, -180, 180),
    north: clamp(north, -90, 90),
  };

  // Detailed geometry over a huge area is the expensive case: cap the
  // viewport span allowed at each zoom level (roughly a 4K screen's worth).
  const maxSpan =
    zoom <= MAX_SPAN_BASE_ZOOM ? 360 : 360 / 2 ** (zoom - MAX_SPAN_BASE_ZOOM);
  if (bbox.east - bbox.west > maxSpan || bbox.north - bbox.south > maxSpan) {
    return NextResponse.json(
      { error: "Bounding box too large for this zoom level" },
      { status: 400 },
    );
  }

  try {
    const geojson = await getParkBoundaries(bbox, zoom);

    return NextResponse.json(geojson, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    });
  } catch (error) {
    console.error("Error fetching park boundaries:", error);

    if (isMemoryError(error)) {
      return NextResponse.json(
        { error: "Boundary query too large — zoom in or reduce the viewport" },
        { status: 503, headers: { "Retry-After": "5" } },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch park boundaries" },
      { status: 500 },
    );
  }
}
