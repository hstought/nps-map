import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { fetchAllParksFromNpsApi } from "@/lib/data/nps-api";
import { upsertParkDetails } from "@/lib/data/parks";

/** Constant-time string comparison so the secret can't be guessed by timing. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Monthly cron endpoint to re-sync park details from the NPS API.
 * Requires `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this
 * automatically when CRON_SECRET is set). Fails closed if the secret is
 * not configured.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET is not set — refusing to run park sync");
    return NextResponse.json(
      { error: "Cron endpoint not configured" },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!safeEqual(authHeader, `Bearer ${cronSecret}`)) {
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
    // Details stay in the server logs, not the response.
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
