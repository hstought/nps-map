# NPS Map

An interactive web map displaying the boundaries of all National Park Service (NPS) units across the United States. Users can pan, zoom, and click on any park to view details and photos.

**Demo:** https://nps-map.vercel.app/

## Tech Stack

- [Next.js](https://nextjs.org) (App Router)
- [React](https://react.dev) 19
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) v4
- [MapLibre GL JS](https://maplibre.org) via react-map-gl
- [Neon](https://neon.tech) (PostgreSQL + PostGIS)
- [Vercel](https://vercel.com) for hosting

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io)
- A [Neon](https://neon.tech) database with PostGIS enabled

### Installation

```bash
git clone https://github.com/hstought/nps-map.git
cd nps-map
pnpm install
```

### Environment Variables

Create a `.env.local` file at the project root with your database connection string and NPS API key:

```
DATABASE_URL=your_neon_connection_string
NPS_API_KEY=your_nps_api_key
```

### Seed the Database

Load park boundaries and details into your Neon database:

```bash
pnpm seed
```

This runs two scripts in sequence: `seed:boundaries` (loads GeoJSON boundary data) and `seed:details` (fetches and caches park metadata from the NPS API).

### Run the Dev Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Architecture

The project groups code by feature and separates concerns between UI, data access, and database logic. Key folders:

```
src/
├── app/                       # Next.js App Router pages and layouts
│   ├── (map)/                 # Map feature route group
│   │   └── _components/       # Map UI components (client)
│   │       ├── MapContainer.tsx
│   │       ├── MapView.tsx
│   │       ├── MapStyleSwitcher.tsx
│   │       └── ParkDetailPopup.tsx
│   └── api/                   # API routes
│       ├── parks/             # Park data endpoints
│       │   └── [code]/        # Single park by unit code
│       └── cron/sync-parks/   # Scheduled data sync
├── lib/
│   ├── config/                # App configuration
│   │   └── map.ts             # Map settings and defaults
│   ├── data/                  # Data access layer
│   │   ├── parks.ts           # Park query functions (PostGIS)
│   │   └── nps-api.ts         # NPS API client
│   └── db/                    # Database connection
│       └── index.ts           # Neon serverless client
├── types/                     # Shared TypeScript types
│   ├── park.ts                # Park domain types
│   └── map.ts                 # Map-related types
scripts/                       # Database seed scripts
├── seed-boundaries.ts         # Load GeoJSON into PostGIS
└── seed-details.ts            # Cache NPS API metadata
docs/                          # Project documentation
```

### Data Flow

1. **Seed Scripts** - Load park boundary GeoJSON and NPS API metadata into a Neon PostGIS database
2. **API Routes** (`/api/parks`) - Query PostGIS for boundaries and park details
3. **Data Layer** (`lib/data/`) - Typed data access functions for all database and API calls
4. **Components** - Consume data via props, never fetch or query directly

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint |
| `pnpm seed` | Seed park boundaries and details |
