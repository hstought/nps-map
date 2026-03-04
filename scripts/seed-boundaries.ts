import { readFileSync } from "fs";
import { resolve } from "path";
import { neon } from "@neondatabase/serverless";

/**
 * Seed script: Import park boundaries from nps_boundary.geojson into PostGIS.
 *
 * Usage: npx tsx scripts/seed-boundaries.ts
 *
 * Requires DATABASE_URL in .env.local
 */

async function main() {
  // Load env from .env.local
  const envPath = resolve(process.cwd(), ".env.local");
  const envContent = readFileSync(envPath, "utf-8");
  for (const rawLine of envContent.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    const match = line.match(/^([^#=]+)=["']?(.*?)["']?$/);
    if (match && match[2]) process.env[match[1].trim()] = match[2].trim();
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not found in .env.local");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const geojsonPath = resolve(process.cwd(), "nps_boundary.geojson");

  console.log("📖 Reading GeoJSON file...");
  const raw = readFileSync(geojsonPath, "utf-8");
  const geojson = JSON.parse(raw);

  const features = geojson.features;
  console.log(`📦 Found ${features.length} features\n`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    const props = feature.properties;
    const unitCode = props.UNIT_CODE;

    if (!unitCode) {
      console.warn(`⚠️  Skipping feature ${i}: no UNIT_CODE`);
      skipped++;
      continue;
    }

    // Normalize Polygon to MultiPolygon for schema consistency
    let geometry = feature.geometry;
    if (geometry.type === "Polygon") {
      geometry = {
        type: "MultiPolygon",
        coordinates: [geometry.coordinates],
      };
    }

    const geojsonStr = JSON.stringify(geometry);

    try {
      await sql`
        INSERT INTO park_boundaries (
          unit_code, unit_name, park_name, unit_type, state, region,
          gnis_id, metadata_url, boundary
        ) VALUES (
          ${unitCode},
          ${props.UNIT_NAME || unitCode},
          ${props.PARKNAME || null},
          ${props.UNIT_TYPE || null},
          ${props.STATE || null},
          ${props.REGION || null},
          ${props.GNIS_ID || null},
          ${props.METADATA || null},
          ST_GeomFromGeoJSON(${geojsonStr})
        )
        ON CONFLICT (unit_code) DO UPDATE SET
          unit_name = EXCLUDED.unit_name,
          park_name = EXCLUDED.park_name,
          unit_type = EXCLUDED.unit_type,
          state = EXCLUDED.state,
          region = EXCLUDED.region,
          gnis_id = EXCLUDED.gnis_id,
          metadata_url = EXCLUDED.metadata_url,
          boundary = EXCLUDED.boundary,
          updated_at = NOW()
      `;
      inserted++;
    } catch (err) {
      console.error(`❌ Error inserting ${unitCode}:`, err);
      errors++;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  ✅ Processed ${i + 1}/${features.length}...`);
    }
  }

  console.log(`\n🏁 Done!`);
  console.log(`   Inserted/updated: ${inserted}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
