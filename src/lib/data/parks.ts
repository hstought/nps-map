import { getDb } from "@/lib/db";
import { getSimplificationTolerance } from "@/lib/config/map";
import type { ParkBoundaryCollection } from "@/types/park";
import type { BBox } from "@/types/map";
import type { ParkDetail } from "@/types/park";
import type { NpsApiPark } from "@/lib/data/nps-api";

/**
 * Fetch park boundaries within a bounding box, simplified by zoom level.
 */
export async function getParkBoundaries(
  bbox: BBox,
  zoom: number
): Promise<ParkBoundaryCollection> {
  const sql = getDb();
  const tolerance = getSimplificationTolerance(zoom);

  const rows = await sql`
    SELECT
      unit_code,
      unit_name,
      park_name,
      unit_type,
      state,
      region,
      ST_AsGeoJSON(
        ST_SimplifyPreserveTopology(boundary, ${tolerance})
      ) AS geojson
    FROM park_boundaries
    WHERE ST_Intersects(
      boundary,
      ST_MakeEnvelope(${bbox.west}, ${bbox.south}, ${bbox.east}, ${bbox.north}, 4326)
    )
  `;

  const features = rows.map((row) => ({
    type: "Feature" as const,
    properties: {
      unitCode: row.unit_code as string,
      unitName: row.unit_name as string,
      parkName: row.park_name as string | null,
      unitType: row.unit_type as string | null,
      state: row.state as string | null,
      region: row.region as string | null,
    },
    geometry: JSON.parse(row.geojson as string),
  }));

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Fetch cached park detail by unit code for the popup.
 */
export async function getParkDetail(
  unitCode: string
): Promise<ParkDetail | null> {
  const sql = getDb();

  const rows = await sql`
    SELECT
      b.unit_code,
      b.unit_name,
      b.unit_type,
      b.state,
      d.full_name,
      d.description,
      d.designation,
      d.url,
      d.weather_info,
      d.latitude,
      d.longitude,
      d.images,
      d.activities,
      d.topics,
      d.entrance_fees,
      d.operating_hours,
      d.contacts,
      d.directions_info,
      d.directions_url
    FROM park_boundaries b
    LEFT JOIN park_details d ON LOWER(b.unit_code) = d.park_code
    WHERE b.unit_code = ${unitCode}
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const row = rows[0];

  return {
    unitCode: row.unit_code as string,
    fullName: (row.full_name as string) || (row.unit_name as string),
    description: row.description as string | null,
    designation: (row.designation as string) || (row.unit_type as string | null),
    state: row.state as string | null,
    url: row.url as string | null,
    weatherInfo: row.weather_info as string | null,
    latitude: row.latitude as number | null,
    longitude: row.longitude as number | null,
    images: (row.images as ParkDetail["images"]) || [],
    activities: (row.activities as ParkDetail["activities"]) || [],
    topics: (row.topics as ParkDetail["topics"]) || [],
    entranceFees: (row.entrance_fees as ParkDetail["entranceFees"]) || [],
    operatingHours: (row.operating_hours as ParkDetail["operatingHours"]) || [],
    contacts: (row.contacts as ParkDetail["contacts"]) || {
      phoneNumbers: [],
      emailAddresses: [],
    },
    directionsInfo: row.directions_info as string | null,
    directionsUrl: row.directions_url as string | null,
  };
}

/**
 * Upsert park details from NPS API data into the database.
 * Used by the cron sync job to keep cached park metadata up-to-date.
 */
export async function upsertParkDetails(
  parks: NpsApiPark[]
): Promise<{ synced: number }> {
  const sql = getDb();
  let synced = 0;

  for (const park of parks) {
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
    synced++;
  }

  return { synced };
}
