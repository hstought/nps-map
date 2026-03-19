import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

/**
 * Seed script: Fetch all parks from the NPS API and cache in park_details table.
 *
 * Usage: npx tsx scripts/seed-details.ts
 *
 * Requires DATABASE_URL and NPS_API_KEY in .env.local
 */

const NPS_API_BASE = "https://developer.nps.gov/api/v1";

interface NpsApiPark {
  parkCode: string;
  fullName: string;
  description: string;
  designation: string;
  states: string;
  latitude: string;
  longitude: string;
  url: string;
  weatherInfo: string;
  directionsInfo: string;
  directionsUrl: string;
  images: Array<{
    url: string;
    credit: string;
    title: string;
    altText: string;
    caption: string;
  }>;
  activities: Array<{ id: string; name: string }>;
  topics: Array<{ id: string; name: string }>;
  entranceFees: Array<{
    cost: string;
    description: string;
    title: string;
  }>;
  operatingHours: Array<{
    name: string;
    description: string;
    standardHours: Record<string, string>;
    exceptions: Array<{
      name: string;
      startDate: string;
      endDate: string;
      exceptionHours: Record<string, string>;
    }>;
  }>;
  contacts: {
    phoneNumbers: Array<{
      phoneNumber: string;
      description: string;
      extension: string;
      type: string;
    }>;
    emailAddresses: Array<{
      emailAddress: string;
      description: string;
    }>;
  };
}

async function main() {
  // Load env from .env.local
  const envPath = resolve(process.cwd(), ".env.local");
  const envContent = readFileSync(envPath, "utf-8");
  for (const rawLine of envContent.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    const match = line.match(/^([^#=]+)=["']?(.*?)["']?$/);
    if (match?.[2]) process.env[match[1].trim()] = match[2].trim();
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not found in .env.local");
    process.exit(1);
  }

  const apiKey = process.env.NPS_API_KEY;
  if (!apiKey) {
    console.error("❌ NPS_API_KEY not found in .env.local");
    console.error(
      "   Get one at: https://www.nps.gov/subjects/developer/get-started.htm",
    );
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  console.log("🌲 Fetching parks from NPS API...\n");

  const allParks: NpsApiPark[] = [];
  const limit = 50;
  let start = 0;
  let total = Infinity;

  while (start < total) {
    const url = `${NPS_API_BASE}/parks?limit=${limit}&start=${start}&api_key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `NPS API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    total = parseInt(data.total, 10);
    allParks.push(...data.data);
    start += limit;

    console.log(`  Fetched ${allParks.length}/${total} parks...`);

    // Small delay to be polite to the API
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log(`\n📦 Total parks from API: ${allParks.length}`);
  console.log("💾 Inserting into database...\n");

  let inserted = 0;
  let errors = 0;

  for (const park of allParks) {
    try {
      await sql`
        INSERT INTO park_details (
          park_code, full_name, description, weather_info, states,
          latitude, longitude, url, images, activities, topics,
          entrance_fees, operating_hours, contacts, directions_info,
          directions_url, designation, last_synced_at, updated_at
        ) VALUES (
          ${park.parkCode},
          ${park.fullName},
          ${park.description},
          ${park.weatherInfo},
          ${park.states},
          ${parseFloat(park.latitude) || null},
          ${parseFloat(park.longitude) || null},
          ${park.url},
          ${JSON.stringify(park.images)},
          ${JSON.stringify(park.activities)},
          ${JSON.stringify(park.topics)},
          ${JSON.stringify(park.entranceFees)},
          ${JSON.stringify(park.operatingHours)},
          ${JSON.stringify(park.contacts)},
          ${park.directionsInfo},
          ${park.directionsUrl},
          ${park.designation},
          NOW(),
          NOW()
        )
        ON CONFLICT (park_code) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          description = EXCLUDED.description,
          weather_info = EXCLUDED.weather_info,
          states = EXCLUDED.states,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          url = EXCLUDED.url,
          images = EXCLUDED.images,
          activities = EXCLUDED.activities,
          topics = EXCLUDED.topics,
          entrance_fees = EXCLUDED.entrance_fees,
          operating_hours = EXCLUDED.operating_hours,
          contacts = EXCLUDED.contacts,
          directions_info = EXCLUDED.directions_info,
          directions_url = EXCLUDED.directions_url,
          designation = EXCLUDED.designation,
          last_synced_at = NOW(),
          updated_at = NOW()
      `;
      inserted++;
    } catch (err) {
      console.error(`❌ Error inserting ${park.parkCode}:`, err);
      errors++;
    }
  }

  // Cross-reference: check for boundaries without details
  const boundaryRows = await sql`SELECT unit_code FROM park_boundaries`;
  const detailRows = await sql`SELECT park_code FROM park_details`;

  const boundaryCodes = new Set(
    boundaryRows.map((r) => (r.unit_code as string).toLowerCase()),
  );
  const detailCodes = new Set(detailRows.map((r) => r.park_code as string));

  const missingDetails = [...boundaryCodes].filter((c) => !detailCodes.has(c));
  const missingBoundaries = [...detailCodes].filter(
    (c) => !boundaryCodes.has(c),
  );

  console.log(`\n🏁 Done!`);
  console.log(`   Inserted/updated: ${inserted}`);
  console.log(`   Errors: ${errors}`);

  if (missingDetails.length > 0) {
    console.log(
      `\n⚠️  ${missingDetails.length} boundaries without API details:`,
    );
    console.log(
      `   ${missingDetails.slice(0, 20).join(", ")}${missingDetails.length > 20 ? "..." : ""}`,
    );
  }

  if (missingBoundaries.length > 0) {
    console.log(
      `\n⚠️  ${missingBoundaries.length} API parks without boundaries:`,
    );
    console.log(
      `   ${missingBoundaries.slice(0, 20).join(", ")}${missingBoundaries.length > 20 ? "..." : ""}`,
    );
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
