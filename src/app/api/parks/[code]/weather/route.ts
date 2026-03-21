import { type NextRequest, NextResponse } from "next/server";
import { getParkDetail } from "@/lib/data/parks";
import { getCurrentWeather } from "@/lib/data/weather";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!code) {
    return NextResponse.json({ error: "Missing park code" }, { status: 400 });
  }

  try {
    const detail = await getParkDetail(code.toUpperCase());

    if (!detail) {
      return NextResponse.json({ error: "Park not found" }, { status: 404 });
    }

    if (!detail.latitude || !detail.longitude) {
      return NextResponse.json(
        { error: "Park has no coordinates" },
        { status: 404 },
      );
    }

    const weather = await getCurrentWeather(detail.latitude, detail.longitude);

    if (!weather) {
      return NextResponse.json(
        { error: "Weather data unavailable" },
        { status: 503 },
      );
    }

    return NextResponse.json(weather, {
      headers: {
        "Cache-Control": "public, max-age=1800, s-maxage=1800",
      },
    });
  } catch (error) {
    console.error("Error fetching weather:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather" },
      { status: 500 },
    );
  }
}
