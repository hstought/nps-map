import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

/**
 * Build script: write a pre-simplified GeoJSON of every park boundary to
 * public/data/parks-overview.geojson.
 *
 * The map loads this static file on first paint (served from the CDN, no
 * database round-trip) and uses it for all zoom levels below
 * OVERVIEW_MAX_ZOOM. Re-run after re-seeding boundaries.
 *
 * Usage: pnpm build:overview  (needs DATABASE_URL in the environment)
 */

// ~1 km — below one screen pixel up to roughly zoom 7.
const TOLERANCE = 0.01;
// 4 decimal places ≈ 11 m, far finer than the tolerance.
const COORD_DECIMALS = 4;
// Square degrees (~0.2 km²); parts smaller than this are dropped unless they
// are a park's largest part.
const MIN_PART_AREA = 2e-5;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  // Work per polygon part:
  //  - drop slivers smaller than MIN_PART_AREA (invisible at overview zooms),
  //    but always keep each park's largest part so small units still appear;
  //  - cap the tolerance relative to the part's size so small parks keep a
  //    recognisable shape instead of collapsing to nothing.
  const rows = await sql`
    WITH parts AS (
      SELECT unit_code, (ST_Dump(boundary)).geom AS g
      FROM park_boundaries
    ),
    ranked AS (
      SELECT
        unit_code, g, ST_Area(g) AS area,
        ROW_NUMBER() OVER (PARTITION BY unit_code ORDER BY ST_Area(g) DESC) AS rn
      FROM parts
    ),
    simplified AS (
      SELECT
        unit_code,
        ST_Collect(
          ST_SimplifyPreserveTopology(g, LEAST(${TOLERANCE}, sqrt(area) / 10))
        ) AS geom
      FROM ranked
      WHERE rn = 1 OR area > ${MIN_PART_AREA}
      GROUP BY unit_code
    )
    SELECT
      b.unit_code, b.unit_name, b.park_name, b.unit_type, b.state, b.region,
      ST_AsGeoJSON(s.geom, ${COORD_DECIMALS}) AS geojson
    FROM park_boundaries b
    JOIN simplified s USING (unit_code)
    ORDER BY b.unit_code
  `;

  const collection = {
    type: "FeatureCollection",
    features: rows.map((row) => ({
      type: "Feature",
      properties: {
        unitCode: row.unit_code,
        unitName: row.unit_name,
        parkName: row.park_name,
        unitType: row.unit_type,
        state: row.state,
        region: row.region,
      },
      geometry: JSON.parse(row.geojson as string),
    })),
  };

  const outPath = resolve(process.cwd(), "public/data/parks-overview.geojson");
  const json = JSON.stringify(collection);
  writeFileSync(outPath, json);

  console.log(
    `✅ Wrote ${rows.length} parks to ${outPath} (${(json.length / 1024).toFixed(0)} KB)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
