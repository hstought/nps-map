import { type NextRequest, NextResponse } from "next/server";
import { searchParks } from "@/lib/data/parks";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=120" },
    });
  }

  try {
    const results = await searchParks(query.trim());
    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=120" },
    });
  } catch (error) {
    console.error("Error searching parks:", error);
    return NextResponse.json(
      { error: "Failed to search parks" },
      { status: 500 },
    );
  }
}
