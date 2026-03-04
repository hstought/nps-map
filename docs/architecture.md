# NPS Map — Architecture Document

> **Status:** Draft — Awaiting review before implementation  
> **Stack:** Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · shadcn/ui · MapLibre GL JS · Neon (PostGIS) · Vercel  
> **Last Updated:** 2026-03-03

---

## 1. Overview

An interactive web map displaying the boundaries of all ~435 National Park Service (NPS) units across the United States. Users can pan, zoom, and click on any territory to view park information and photos. Boundary geometries are stored in a Neon PostgreSQL database with PostGIS, and park metadata is cached from the NPS Developer API.

---

## 2. Data Flow

```
┌─────────────────┐      seed-boundaries.ts      ┌───────────────────────┐
│ nps_boundary.    │ ──────────────────────────▶  │  Neon / PostGIS       │
│ geojson (50MB+)  │                              │                       │
└─────────────────┘                               │  park_boundaries      │
                                                  │  park_details         │
┌─────────────────┐      seed-details.ts          │                       │
│  NPS API         │ ──────────────────────────▶  │  (cached metadata     │
│  /api/v1/parks   │                              │   + images JSONB)     │
└─────────────────┘                               └───────────┬───────────┘
                                                              │
                                                   SQL queries (PostGIS)
                                                              │
                                                  ┌───────────▼───────────┐
                                                  │  Next.js API Routes   │
                                                  │                       │
                                                  │  GET /api/parks       │
                                                  │  GET /api/parks/[code]│
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
| 0–4    | 0.05      | Very simplified      |
| 5–7    | 0.01      | Moderate             |
| 8–10   | 0.005     | Detailed             |
| 11–13  | 0.001     | High detail          |
| 14+    | 0.0001    | Full detail          |

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
  "directionsInfo": "...",
  "directionsUrl": "..."
}
```

---

## 5. Component Tree

```
app/
├── layout.tsx                    ← Root layout (fonts, global styles)
├── page.tsx                      ← Server Component, renders map page
├── globals.css                   ← Tailwind v4 entry
│
├── (map)/
│   └── _components/
│       ├── MapContainer.tsx      ← next/dynamic wrapper (ssr: false)
│       ├── MapView.tsx           ← "use client" — react-map-gl map
│       ├── ParkDetailPopup.tsx   ← "use client" — park info card
│       ├── MapStyleSwitcher.tsx  ← "use client" — basemap toggle
│       └── MapControls.tsx       ← "use client" — zoom/nav controls
│
├── api/
│   └── parks/
│       ├── route.ts              ← GET /api/parks (viewport query)
│       └── [code]/
│           └── route.ts          ← GET /api/parks/[code] (detail)
│
lib/
├── db/
│   └── index.ts                  ← Neon serverless client setup
├── data/
│   ├── parks.ts                  ← Read operations (PostGIS queries)
│   └── nps-api.ts                ← NPS API client (for seed/sync)
├── config/
│   └── map.ts                    ← Tile provider URLs, default viewport
├── actions/
│   └── sync-parks.ts             ← Server Action for monthly re-sync
│
types/
├── park.ts                       ← Shared park type definitions
├── map.ts                        ← Map-related types (viewport, etc.)
│
scripts/
├── seed-boundaries.ts            ← Import GeoJSON → PostGIS
└── seed-details.ts               ← Fetch NPS API → park_details cache
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

| Unit Type                | Fill Color   | Opacity |
|--------------------------|--------------|---------|
| National Park            | `#2D6A4F`   | 0.35    |
| National Monument        | `#D4A843`   | 0.30    |
| National Historic Site   | `#8B4513`   | 0.25    |
| National Recreation Area | `#4A90D9`   | 0.30    |
| National Seashore        | `#1B98C4`   | 0.30    |
| Other                    | `#6B7280`   | 0.25    |

**Hover state:** Fill opacity increases to 0.55, 2px white border appears.

### 6.3 MapStyleSwitcher

A small toggle button group (shadcn `ToggleGroup`) positioned top-right of the map:
- **Standard** — OpenFreeMap Liberty (always available)
- **Outdoors** — Stadia Outdoors (available when `NEXT_PUBLIC_STADIA_API_KEY` is set)
  - If env var is missing: option is visible but disabled with a tooltip "Stadia API key required"

---

## 7. ParkDetailPopup Design

A floating card anchored to the clicked polygon, built with shadcn `Card`:

```
┌──────────────────────────────┐
│  ┌────────────────────────┐  │
│  │                        │  │   ← Hero image (next/image, 16:9)
│  │      Park Photo        │  │      from park_details.images[0]
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  Yosemite National Park      │   ← full_name (semibold, lg)
│  ┌──────────────┐ CA         │   ← designation badge + state
│  │ National Park│            │
│  └──────────────┘            │
│                              │
│  Not just a great valley,    │   ← description (2-3 lines, truncated)
│  Yosemite is a shrine to...  │
│                              │
│  ┌──────────┐  ╳             │   ← "Visit NPS.gov →" link + close btn
│  └──────────┘                │
└──────────────────────────────┘

Max width: 384px (max-w-sm)
Shadow: shadow-lg
Border radius: rounded-xl
Animation: fade-in + slight scale (animate-in)
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
| Map tiles         | OpenFreeMap / Stadia | Browser cache    | Managed by tile provider |

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
| `DATABASE_URL`                 | Yes      | `.env.local`   | Neon connection string (from MCP)   |
| `NPS_API_KEY`                  | Yes      | `.env.local`   | NPS Developer API key               |
| `NEXT_PUBLIC_STADIA_API_KEY`   | No       | `.env.local`   | Stadia Maps key (Outdoors basemap)  |
| `CRON_SECRET`                  | Yes      | Vercel only    | Protects the monthly sync endpoint  |

---

## 11. Key Dependencies

| Package                    | Purpose                              |
|----------------------------|--------------------------------------|
| `react-map-gl`             | React wrapper for MapLibre GL JS     |
| `maplibre-gl`              | WebGL map rendering engine           |
| `@neondatabase/serverless` | Neon serverless Postgres driver      |
| `next`                     | React framework (App Router)         |
| `tailwindcss`              | Utility-first CSS                    |
| `@radix-ui/*` (via shadcn) | Accessible UI primitives             |

---

## 12. Deployment Checklist (Vercel)

- [ ] Push to GitHub repository
- [ ] Connect repo to Vercel
- [ ] Add `DATABASE_URL` env var (Neon connection string)
- [ ] Add `NPS_API_KEY` env var
- [ ] Optionally add `NEXT_PUBLIC_STADIA_API_KEY`
- [ ] Add `CRON_SECRET` env var
- [ ] Run seed scripts locally before first deploy
- [ ] Verify map loads with OpenFreeMap tiles
- [ ] Verify popup loads park details from cache
- [ ] Verify Stadia Outdoors toggle (if key is set)

---

## 13. Future Enhancements

- **Vector tiles via Martin** — Serve boundaries directly from PostGIS as MVT tiles for automatic viewport-based loading (eliminates `/api/parks` route)
- **Search / filter** — Filter parks by `unit_type`, state, or activity
- **Park detail page** — `/park/[parkCode]` with full information, photo gallery, operating hours
- **Campground / visitor center layers** — Additional NPS API data overlays
- **Offline / PWA** — Cache tiles and park data for offline use in the field
