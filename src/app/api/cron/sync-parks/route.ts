import { type NextRequest, NextResponse } from "next/server";
import { fetchAllParksFromNpsApi } from "@/lib/data/nps-api";
import { upsertParkDetails } from "@/lib/data/parks";

/**
 * Monthly cron endpoint to re-sync park details from the NPS API.
 * Protected by CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.NPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "NPS_API_KEY not configured" },
      { status: 500 },
    );
  }

  try {
    const parks = await fetchAllParksFromNpsApi(apiKey);
    const { synced } = await upsertParkDetails(parks);

    return NextResponse.json({
      message: `Synced ${synced} parks`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 },
    );
  }
}
