# Park Boundary Sharpness Improvement Options

This document outlines options for improving the sharpness and accuracy of park boundary
rendering on the NPS map. It is intentionally gitignored and serves as a local planning reference.

---

## Background

Park boundaries are stored as PostGIS geometries in the `park_boundaries` table.
On the API side, boundaries are simplified via `ST_Simplify` before being served as GeoJSON
to reduce payload size. On the client side, the simplified GeoJSON is rendered as fill and
outline layers via MapLibre GL.

The original `getSimplificationTolerance` values were aggressive, causing visibly jagged edges
— especially at zoom levels 7–13 where users are interacting closely with individual parks.

---

## Option 1 — Refine Simplification Tolerances + Topology-Preserving Simplification ✅ (Implemented)

**What it does:**
- Switch from `ST_Simplify` to `ST_SimplifyPreserveTopology` in the boundary query.
  This prevents the creation of self-intersecting or invalid geometries, yielding cleaner edges.
- Reduce the simplification tolerances at every zoom tier (approximately 5× finer detail each step).
- Increase the outline line-width from 0.5 px to 1 px and darken the stroke from 30% to 60% opacity
  so boundaries are crisply visible on all base map styles.

**Trade-off:** Slightly larger GeoJSON payloads at lower zoom levels.
  Benchmarks show ~15–25 % larger responses at zoom 4, negligible at zoom 10+.

**Files changed:**
- `src/lib/config/map.ts` — updated `getSimplificationTolerance`
- `src/lib/data/parks.ts` — switched to `ST_SimplifyPreserveTopology`
- `src/app/(map)/_components/MapView.tsx` — updated `outlinePaint`

---

## Option 2 — Serve Boundaries as Mapbox Vector Tiles (MVT)

**What it does:**
- Replace the GeoJSON `/api/parks` endpoint with an MVT tile endpoint (`/api/tiles/[z]/[x]/[y]`).
- Use PostGIS `ST_AsMVT` + `ST_AsMVTGeom` to produce binary vector tiles natively.
- MapLibre natively renders MVT tiles at the correct resolution for every zoom level without
  any client-side decoding overhead.

**Pros:** Best long-term scalability; tiles can be cached at CDN edge; no over-simplification.
**Cons:** Requires a new tile endpoint, client-side Source type change (`type: "vector"`), and
  a tile layer scheme update. More complex infrastructure.

---

## Option 3 — Pre-computed Multi-Resolution Geometries

**What it does:**
- Add columns `boundary_z4`, `boundary_z8`, `boundary_z12`, `boundary_full` to `park_boundaries`.
- Pre-compute simplified versions once at seed time rather than on every API call.
- The query picks the right column based on zoom level.

**Pros:** Zero per-request PostGIS CPU cost; highly cacheable.
**Cons:** Requires a schema migration and re-seed; boundary data must be re-simplified whenever
  the source dataset is updated.

---

## Option 4 — Higher-Resolution Source Dataset

**What it does:**
- Replace the current NPS boundary GeoJSON source with the official NPS IRMA dataset or
  the Census TIGER/Line boundaries, which have higher vertex density.
- Re-seed the database with the new source.

**Pros:** Fundamentally better geometry; all rendering approaches benefit.
**Cons:** Requires sourcing, converting, and re-seeding a new dataset; may need schema changes
  for new attribute fields.

---

## Recommendation

Start with **Option 1** (already implemented) as an immediate, low-risk improvement with no
infrastructure changes. Evaluate **Option 2** (MVT tiles) as the long-term architecture for
production scale, and consider **Option 4** alongside it if source data quality is the root cause.
