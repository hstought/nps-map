import { NextRequest, NextResponse } from "next/server";
import { getParkBoundaries } from "@/lib/data/parks";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const bboxParam = searchParams.get("bbox");
  const zoomParam = searchParams.get("zoom");

  if (!bboxParam || !zoomParam) {
    return NextResponse.json(
      { error: "Missing required parameters: bbox, zoom" },
      { status: 400 }
    );
  }

  const [west, south, east, north] = bboxParam.split(",").map(Number);

  if ([west, south, east, north].some(isNaN)) {
    return NextResponse.json(
      { error: "Invalid bbox format. Expected: west,south,east,north" },
      { status: 400 }
    );
  }

  const zoom = parseFloat(zoomParam);

  if (isNaN(zoom)) {
    return NextResponse.json(
      { error: "Invalid zoom value" },
      { status: 400 }
    );
  }

  try {
    const geojson = await getParkBoundaries(
      { west, south, east, north },
      zoom
    );

    return NextResponse.json(geojson, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    });
  } catch (error) {
    console.error("Error fetching park boundaries:", error);
    return NextResponse.json(
      { error: "Failed to fetch park boundaries" },
      { status: 500 }
    );
  }
}
