import { type NextRequest, NextResponse } from "next/server";
import { getParkDetail } from "@/lib/data/parks";

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

    return NextResponse.json(detail, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Error fetching park detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch park detail" },
      { status: 500 },
    );
  }
}
