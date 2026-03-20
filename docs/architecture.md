# NPS Map — Architecture Document

> **Status:** Implemented  
> **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · MapLibre GL JS · Neon (PostGIS) · Vercel  
> **Last Updated:** 2026-03-20

---

## 1. Overview

An interactive web map displaying the boundaries of all ~435 National Park Service (NPS) units across the United States. Users can pan, zoom, and click on any territory to view park information, photos, live weather, entrance fees, and operating hours. Boundary geometries are stored in a Neon PostgreSQL database with PostGIS, and park metadata is cached from the NPS Developer API. The app includes park search, type-based filtering, and an image carousel in the detail popup.

---

## 2. Data Flow

```
┌─────────────────┐      seed-boundaries.ts      ┌───────────────────────┐
│ nps_boundary.    │ ──────────────────────────▶  │  Neon / PostGIS       │
│ geojson (50MB+)  │                              │                       │
└─────────────────┘                               │  park_boundaries      │
                                                  │  park_details         │
┌─────────────────┐      seed-details.ts /        │                       │
│  NPS API         │      cron sync-parks  ────▶  │  (cached metadata     │
│  /api/v1/parks   │                              │   + images JSONB)     │
└─────────────────┘                               └───────────┬───────────┘
                                                              │
┌─────────────────┐                                SQL queries (PostGIS)
│  WeatherAPI.com  │                                          │
│  /v1/current     │──┐                           ┌───────────▼───────────┐
└─────────────────┘  │                            │  Next.js API Routes   │
                     │                            │                       │
                     └───────────────────────────▶│  GET /api/parks       │
                                                  │  GET /api/parks/[code]│
                                                  │  GET /api/parks/[code]│
                                                  │       /weather        │
                                                  │  GET /api/parks/search│
                                                  │  GET /api/cron/       │
                                                  │       sync-parks      │
                                                  └───────────┬───────────┘
                                                              │
                                                        JSON / GeoJSON
                                                              │
                                                  ┌───────────▼───────────┐
                                                  │  react-map-gl Client  │
                                                  │  (MapLibre GL JS)     │
                                                  │                       │
                                                  │  MapView              │
                                                  │  ParkDetailPopup      │
                                                  │  ParkSearch           │
                                                  │  ParkTypeFilter       │
                                                  │  MapStyleSwitcher     │
                                                  └───────────────────────┘
```

---

## 3. Database Schema (Neon + PostGIS)

### 3.1 `park_boundaries`

Stores the polygon/multipolygon geometries from `nps_boundary.geojson`.

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE park_boundaries (
  id            SERIAL PRIMARY KEY,
  unit_code     VARCHAR(10) UNIQUE NOT NULL,   -- join key to NPS API (e.g., "YOSE")
  unit_name     TEXT NOT NULL,                 -- "Yosemite National Park"
  park_name     TEXT,                          -- "Yosemite"
  unit_type     TEXT,                          -- "National Park"
  state         VARCHAR(10),                   -- "CA" (can be multi-state e.g., "WY,MT,ID")
  region        VARCHAR(5),                    -- NPS region code
  gnis_id       VARCHAR(20),
  metadata_url  TEXT,
  boundary      GEOMETRY(MultiPolygon, 4326) NOT NULL,  -- WGS 84
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for viewport queries (ST_Intersects)
CREATE INDEX idx_boundaries_geom ON park_boundaries USING GIST(boundary);

-- Lookup by unit code
CREATE INDEX idx_boundaries_unit_code ON park_boundaries(unit_code);

-- Filter by unit type
CREATE INDEX idx_boundaries_unit_type ON park_boundaries(unit_type);
```

### 3.2 `park_details`

Caches metadata fetched from the NPS Developer API to avoid rate limits.

```sql
CREATE TABLE park_details (
  id              SERIAL PRIMARY KEY,
  park_code       VARCHAR(10) UNIQUE NOT NULL,  -- matches unit_code (lowercased)
  full_name       TEXT NOT NULL,
  description     TEXT,
  weather_info    TEXT,
  states          TEXT,                          -- comma-separated state codes
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  url             TEXT,                          -- nps.gov page URL
  images          JSONB DEFAULT '[]'::JSONB,     -- [{url, credit, title, altText, caption}]
  activities      JSONB DEFAULT '[]'::JSONB,     -- [{id, name}]
  topics          JSONB DEFAULT '[]'::JSONB,     -- [{id, name}]
  entrance_fees   JSONB DEFAULT '[]'::JSONB,     -- [{cost, description, title}]
  operating_hours JSONB DEFAULT '[]'::JSONB,     -- [{name, description, standardHours, exceptions}]
  contacts        JSONB DEFAULT '{}'::JSONB,     -- {phoneNumbers, emailAddresses}
  directions_info TEXT,
  directions_url  TEXT,
  designation     TEXT,                          -- "National Park", "National Monument", etc.
  last_synced_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_details_park_code ON park_details(park_code);
```

### 3.3 Join Pattern

```sql
-- Popup query: boundary + cached detail for a single park
SELECT
  b.unit_code,
  b.unit_name,
  b.unit_type,
  b.state,
  ST_AsGeoJSON(b.boundary) AS geojson,
  d.full_name,
  d.description,
  d.images,
  d.url,
  d.designation
FROM park_boundaries b
LEFT JOIN park_details d ON LOWER(b.unit_code) = d.park_code
WHERE b.unit_code = $1;
```

---

## 4. API Routes

### 4.1 `GET /api/parks`

Returns simplified park boundaries within a viewport.

**Query Parameters:**

| Param   | Type   | Required | Description                          |
|---------|--------|----------|--------------------------------------|
| `bbox`  | string | Yes      | `west,south,east,north` (lng/lat)    |
| `zoom`  | number | Yes      | Current map zoom level (0–22)        |

**PostGIS Query Logic:**

```sql
SELECT
  b.unit_code,
  b.unit_name,
  b.park_name,
  b.unit_type,
  b.state,
  b.region,
  ST_AsGeoJSON(
    ST_Simplify(b.boundary, $tolerance)
  ) AS geojson
FROM park_boundaries b
WHERE ST_Intersects(
  b.boundary,
  ST_MakeEnvelope($west, $south, $east, $north, 4326)
);
```

**Simplification Tolerance by Zoom:**

| Zoom   | Tolerance | Detail Level         |
|--------|-----------|----------------------|
| 0–3    | 0.05      | Very simplified      |
| 4      | 0.02      | Simplified           |
| 5–6    | 0.01      | Moderate             |
| 7–9    | 0.005     | Detailed             |
| 10–12  | 0.001     | High detail          |
| 13     | 0.0005    | Very high detail     |
| 14+    | 0.0001    | Full detail          |

**Memory Error Handling:**

PostGIS can run out of memory on complex geometries. The data layer detects OOM errors (`bad_alloc`, `TopologyException`) and retries with progressively lighter simplification:
1. `ST_SimplifyPreserveTopology` (default)
2. `ST_Simplify` (fallback)
3. `ST_Simplify` with 5× tolerance (last resort)

The API returns a maximum of 250 boundaries per request.

**Response:** GeoJSON `FeatureCollection`

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "unitCode": "YOSE",
        "unitName": "Yosemite National Park",
        "parkName": "Yosemite",
        "unitType": "National Park",
        "state": "CA",
        "region": "PW"
      },
      "geometry": { "type": "MultiPolygon", "coordinates": [...] }
    }
  ]
}
```

### 4.2 `GET /api/parks/[code]`

Returns cached park detail for the popup.

**Cache-Control:** `public, max-age=3600, s-maxage=86400` (1h client, 24h CDN)

**Response:**

```json
{
  "unitCode": "YOSE",
  "fullName": "Yosemite National Park",
  "description": "Not just a great valley...",
  "designation": "National Park",
  "state": "CA",
  "url": "https://www.nps.gov/yose/index.htm",
  "weatherInfo": "...",
  "images": [
    {
      "url": "https://www.nps.gov/common/uploads/...",
      "credit": "NPS Photo",
      "title": "Half Dome",
      "altText": "Half Dome from Glacier Point",
      "caption": "..."
    }
  ],
  "activities": [...],
  "entranceFees": [...],
  "operatingHours": [...],
  "directionsInfo": "...",
  "directionsUrl": "..."
}
```

### 4.3 `GET /api/parks/[code]/weather`

Returns current weather conditions for a park using WeatherAPI.com.

**Cache-Control:** `public, max-age=1800, s-maxage=1800` (30m)

**Response:**

```json
{
  "tempF": 72,
  "feelsLikeF": 70,
  "conditionText": "Partly cloudy",
  "conditionIcon": "//cdn.weatherapi.com/weather/64x64/day/116.png",
  "humidity": 45,
  "windMph": 8,
  "windDir": "SW"
}
```

**Error Handling:**
- 404 if park not found or missing coordinates
- 503 if weather API unavailable (graceful degradation)

### 4.4 `GET /api/parks/search`

Searches parks by name using ILIKE.

**Query Parameters:**

| Param | Type   | Required | Description                  |
|-------|--------|----------|------------------------------|
| `q`   | string | Yes      | Search query (min 2 chars)   |

**Cache-Control:** `public, max-age=60, s-maxage=120` (1m client, 2m CDN)

**Response:** Array of `ParkSearchResult` (max 10 results)

```json
[
  {
    "unitCode": "YOSE",
    "unitName": "Yosemite National Park",
    "unitType": "National Park",
    "state": "CA",
    "latitude": 37.8651,
    "longitude": -119.5383
  }
]
```

### 4.5 `GET /api/cron/sync-parks`

Monthly cron endpoint that re-syncs park metadata from the NPS API.

**Security:** Protected by `Authorization: Bearer {CRON_SECRET}` header.

**Triggered by:** Vercel Cron (`0 3 1 * *` — 3 AM UTC on the 1st of each month)

---

## 5. Component Tree

```
app/
├── layout.tsx                       ← Root layout (fonts, Vercel Analytics)
├── page.tsx                         ← Server Component, renders map page
├── error.tsx                        ← Error boundary ("use client")
├── globals.css                      ← Tailwind v4 entry + MapLibre overrides
│
├── (map)/
│   └── _components/
│       ├── MapContainer.tsx         ← next/dynamic wrapper (ssr: false)
│       ├── MapView.tsx              ← "use client" — main interactive map
│       ├── ParkDetailPopup.tsx      ← "use client" — expandable park info card
│       ├── ImageCarousel.tsx        ← "use client" — Embla image carousel
│       ├── CurrentWeatherSection.tsx ← "use client" — live weather display
│       ├── EntranceFeesSection.tsx   ← "use client" — collapsible fee list
│       ├── OperatingHoursSection.tsx ← "use client" — collapsible hours/exceptions
│       ├── MapStyleSwitcher.tsx      ← "use client" — basemap toggle
│       ├── ParkSearch.tsx            ← "use client" — search with dropdown
│       └── ParkTypeFilter.tsx        ← "use client" — type filter with groups
│
├── api/
│   ├── parks/
│   │   ├── route.ts                 ← GET /api/parks (viewport query)
│   │   ├── search/
│   │   │   └── route.ts             ← GET /api/parks/search
│   │   └── [code]/
│   │       ├── route.ts             ← GET /api/parks/[code] (detail)
│   │       └── weather/
│   │           └── route.ts         ← GET /api/parks/[code]/weather
│   └── cron/
│       └── sync-parks/
│           └── route.ts             ← GET /api/cron/sync-parks (monthly)
│
lib/
├── db/
│   └── index.ts                     ← Neon serverless client setup
├── data/
│   ├── parks.ts                     ← Read operations (PostGIS queries)
│   ├── weather.ts                   ← WeatherAPI.com client
│   └── nps-api.ts                   ← NPS API client (for seed/sync)
├── config/
│   └── map.ts                       ← Tile URLs, colors, default viewport
├── constants/
│   └── national-parks.ts            ← Canonical list of 63 National Park codes
│
types/
├── park.ts                          ← Park + weather type definitions
├── map.ts                           ← Map-related types (viewport, etc.)
│
scripts/
├── seed-boundaries.ts               ← Import GeoJSON → PostGIS
└── seed-details.ts                  ← Fetch NPS API → park_details cache
```

---

## 6. Map Configuration

### 6.1 Tile Providers

```typescript
// lib/config/map.ts

export const MAP_STYLES = {
  liberty: {
    name: "Standard",
    url: "https://tiles.openfreemap.org/styles/liberty",
    requiresApiKey: false,
  },
  outdoors: {
    name: "Outdoors",
    url: "https://tiles.stadiamaps.com/styles/outdoors.json",
    requiresApiKey: true,
    apiKeyEnvVar: "NEXT_PUBLIC_STADIA_API_KEY",
  },
} as const;

export const DEFAULT_STYLE = "liberty";

export const INITIAL_VIEW_STATE = {
  longitude: -98.5,
  latitude: 39.8,
  zoom: 4,
};
```

### 6.2 Polygon Styling

Territories colored by `unit_type` using MapLibre expressions:

| Unit Type                          | Fill Color   | Opacity |
|------------------------------------|--------------|--------|
| National Park (+ variants)         | `#2D6A4F`   | 0.35    |
| National Monument (+ variants)     | `#D4A843`   | 0.30    |
| National Historic Site / Hist. Park| `#8B4513`   | 0.25    |
| National Recreation Area           | `#4A90D9`   | 0.30    |
| National Seashore / Lakeshore      | `#1B98C4`   | 0.30    |
| National Preserve                  | `#5B8C5A`   | 0.30    |
| National Memorial                  | `#9B59B6`   | 0.30    |
| National Military Park / Battlefield| `#C0392B`  | 0.30    |
| Other                              | `#6B7280`   | 0.25    |

**Hover state:** Fill opacity increases to 0.55, 2px white border appears.

### 6.3 MapStyleSwitcher

A button group positioned top-right of the map:
- **Standard** — OpenFreeMap Liberty (always available)
- **Outdoors** — Stadia Outdoors (available when `NEXT_PUBLIC_STADIA_API_KEY` is set)
  - If env var is missing: option is visible but disabled (gray, cursor-not-allowed)

### 6.4 ParkSearch

A search input positioned on the map with a dropdown results list:
- Debounced search (250ms) querying `/api/parks/search`
- Minimum 2 characters to trigger
- Keyboard navigation (Arrow keys, Enter, Escape)
- Outside-click detection to close dropdown
- Selecting a result flies the map to the park and opens the popup

### 6.5 ParkTypeFilter

A filter dropdown that groups ~435 NPS units into 9 categories:

| Group                              | Count |
|------------------------------------|-------|
| National Park                      | 63    |
| National Monument                  | 87    |
| National Historic Site             | 140   |
| National Recreation Area           | 18    |
| National Seashore / Lakeshore      | 13    |
| National Preserve                  | 13    |
| National Memorial                  | 31    |
| National Military Park / Battlefield| 20   |
| Other                              | 46    |

- Color-coded swatches matching polygon fill colors
- "Select All" / "Unselect All" toggle
- Handles dual-designation parks (e.g., "National Park & Preserve") by showing them in both parent groups
- Ring indicator on the filter button when not all types are enabled

---

## 7. ParkDetailPopup Design

A floating card anchored to the clicked polygon with scrollable content:

```
┌──────────────────────────────┐
│  ┌────────────────────────┐  │
│  │    Image Carousel      │  │   ← Embla carousel with dots + arrows
│  │    (embla-carousel)    │  │      Fallback: 🏞️ emoji if no images
│  └────────────────────────┘  │
│                              │
│  Yosemite National Park      │   ← full_name (semibold, base)
│  ┌──────────────┐ CA         │   ← designation badge + state
│  │ National Park│            │
│  └──────────────┘            │
│                              │
│  ┌ Current Weather ────────┐ │   ← Live weather from WeatherAPI.com
│  │ ☀️ 72°F  Partly cloudy  │ │      Temp, feels-like, wind, humidity
│  │ Feels like 70°F         │ │      30-minute cache, graceful fallback
│  └─────────────────────────┘ │
│                              │
│  Not just a great valley,    │   ← description (truncated 180 chars)
│  Yosemite is a shrine to...  │      "See more" / "See less" toggle
│                              │
│  ▸ Operating Hours           │   ← Collapsible, day-by-day grid
│                              │      Handles exceptions, multiple sets
│  ▸ Entrance Fees             │   ← Collapsible, formatted costs
│                              │      "Free" for $0 entries
│  ┌──────────┐                │
│  │Visit NPS →│               │   ← External link to nps.gov
│  └──────────┘                │
└──────────────────────────────┘

Width: 384px (w-96)
Max height: 55vh (scrollable content area)
Shadow: shadow
```

---

## 8. Seed Scripts

### 8.1 `scripts/seed-boundaries.ts`

1. Read `nps_boundary.geojson` (streaming JSON parse for 50MB+ file)
2. For each feature:
   - Extract `UNIT_CODE`, `UNIT_NAME`, `PARKNAME`, `UNIT_TYPE`, `STATE`, `REGION`, `GNIS_ID`, `METADATA`
   - Convert `Polygon` geometries to `MultiPolygon` for schema consistency
   - Insert via `ST_GeomFromGeoJSON()` with `ON CONFLICT (unit_code) DO UPDATE`
3. Log progress every 50 features
4. Report final count

### 8.2 `scripts/seed-details.ts`

1. Fetch all parks from NPS API: `GET /api/v1/parks?limit=50&start=0` (paginated, ~10 pages)
2. For each park in response:
   - Map to `park_details` schema
   - Upsert via `ON CONFLICT (park_code) DO UPDATE SET ..., last_synced_at = NOW()`
3. Log unmatched `park_code` values (parks in API but not in boundary data, and vice versa)
4. Report final count + sync timestamp

---

## 9. Caching Strategy

| Data              | Source           | Stored In           | Refresh Frequency |
|-------------------|------------------|---------------------|-------------------|
| Park boundaries   | `nps_boundary.geojson` | `park_boundaries`   | Manual (data rarely changes) |
| Park details      | NPS API `/parks` | `park_details`      | Monthly (Vercel Cron) |
| Simplified geom   | PostGIS query    | None (computed)     | Per-request via `ST_Simplify` |
| Current weather   | WeatherAPI.com   | Server fetch cache  | 30 min (`revalidate: 1800`) |
| Map tiles         | OpenFreeMap / Stadia | Browser cache    | Managed by tile provider |

**HTTP Cache-Control Headers:**

| Endpoint               | Client (`max-age`) | CDN (`s-maxage`) |
|------------------------|--------------------|------------------|
| `/api/parks`           | 5 min              | 10 min           |
| `/api/parks/[code]`    | 1 hour             | 24 hours         |
| `/api/parks/[code]/weather` | 30 min        | 30 min           |
| `/api/parks/search`    | 1 min              | 2 min            |

### Monthly Sync (Vercel Cron)

```
// vercel.json
{
  "crons": [{
    "path": "/api/cron/sync-parks",
    "schedule": "0 3 1 * *"    // 3 AM UTC on the 1st of each month
  }]
}
```

The cron endpoint calls the same logic as `seed-details.ts` but as a Route Handler protected by `CRON_SECRET`.

---

## 10. Environment Variables

| Variable                       | Required | Where          | Description                         |
|--------------------------------|----------|----------------|-------------------------------------|
| `DATABASE_URL`                 | Yes      | `.env.local`   | Neon PostgreSQL connection string   |
| `NPS_API_KEY`                  | Yes      | `.env.local`   | NPS Developer API key               |
| `WEATHER_API_KEY`              | No       | `.env.local`   | WeatherAPI.com key (live weather)   |
| `NEXT_PUBLIC_STADIA_API_KEY`   | No       | `.env.local`   | Stadia Maps key (Outdoors basemap)  |
| `CRON_SECRET`                  | Yes      | Vercel only    | Protects the monthly sync endpoint  |

---

## 11. Key Dependencies

| Package                    | Purpose                              |
|----------------------------|--------------------------------------|
| `next` 16                  | React framework (App Router)         |
| `react` 19                 | UI library                           |
| `react-map-gl`             | React wrapper for MapLibre GL JS     |
| `maplibre-gl`              | WebGL map rendering engine           |
| `@neondatabase/serverless` | Neon serverless Postgres driver      |
| `tailwindcss` v4           | Utility-first CSS                    |
| `embla-carousel-react`     | Image carousel for park popup        |
| `lucide-react`             | Icon library                         |
| `@vercel/analytics`        | Vercel Web Analytics                 |

---

## 12. Deployment Checklist (Vercel)

- [ ] Push to GitHub repository
- [ ] Connect repo to Vercel
- [ ] Add `DATABASE_URL` env var (Neon connection string)
- [ ] Add `NPS_API_KEY` env var
- [ ] Add `CRON_SECRET` env var
- [ ] Optionally add `WEATHER_API_KEY` for live weather
- [ ] Optionally add `NEXT_PUBLIC_STADIA_API_KEY` for Outdoors basemap
- [ ] Run seed scripts locally before first deploy (`pnpm seed`)
- [ ] Verify map loads with OpenFreeMap tiles
- [ ] Verify popup loads park details with carousel
- [ ] Verify search and type filtering work
- [ ] Verify weather section loads (if key is set)
- [ ] Verify Stadia Outdoors toggle (if key is set)

---

## 13. Future Enhancements

- **Vector tiles via Martin** — Serve boundaries directly from PostGIS as MVT tiles for automatic viewport-based loading (eliminates `/api/parks` route)
- **State / activity filtering** — Filter parks by state or activity in addition to type
- **Park detail page** — `/park/[parkCode]` with full information, extended photo gallery
- **Campground / visitor center layers** — Additional NPS API data overlays
- **Offline / PWA** — Cache tiles and park data for offline use in the field
