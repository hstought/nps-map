# National Park Maps

An interactive web map displaying the boundaries of all ~435 National Park Service (NPS) units across the United States. Users can pan, zoom, search, filter by type, and click on any park to view details, photos, live weather, entrance fees, and operating hours.

**Demo:** https://nps-map.vercel.app/

## Features

- **Interactive map** — Pan, zoom, and click park boundaries rendered with MapLibre GL JS, color-coded by unit type
- **Park detail popup** — Image carousel, description, live weather, operating hours, entrance fees, and NPS.gov link
- **Park search** — Debounced autocomplete search with full keyboard navigation (Arrow keys, Enter, Escape) and fly-to selection
- **Type filtering** — Filter ~435 NPS units across 9 color-coded categories (National Parks, Monuments, Historic Sites, etc.)
- **Automatic data sync** — Monthly Vercel Cron job refreshes cached park metadata from the NPS API
- **Comprehensive test suite** — Unit tests for all components, API routes, and data layer functions using Vitest + Testing Library

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router)
- [React](https://react.dev) 19
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) v4
- [MapLibre GL JS](https://maplibre.org) via react-map-gl
- [Neon](https://neon.tech) (PostgreSQL + PostGIS)
- [Biome](https://biomejs.dev) for linting and formatting
- [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) for testing
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

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable                     | Required | Description                                   |
|------------------------------|----------|-----------------------------------------------|
| `DATABASE_URL`               | Yes      | Neon PostgreSQL connection string              |
| `NPS_API_KEY`                | Yes      | [NPS Developer API](https://www.nps.gov/subjects/developer/get-started.htm) key |
| `WEATHER_API_KEY`            | No       | [WeatherAPI.com](https://www.weatherapi.com/) key for live weather in popups |
| `CRON_SECRET`                | No       | Protects the `/api/cron/sync-parks` endpoint (required on Vercel) |

### Seed the Database

Load park boundaries and details into your Neon database:

```bash
pnpm seed
```

This runs two scripts in sequence: `seed:boundaries` (loads GeoJSON boundary data into PostGIS) and `seed:details` (fetches and caches park metadata from the NPS API).

### Run the Dev Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
src/
├── app/                          # Next.js App Router pages and layouts
│   ├── (map)/                    # Map feature route group
│   │   └── _components/          # Map UI components (client)
│   │       ├── MapContainer.tsx       # next/dynamic wrapper (ssr: false)
│   │       ├── MapView.tsx            # Main interactive map
│   │       ├── ParkDetailPopup.tsx    # Expandable park info card
│   │       ├── ImageCarousel.tsx      # Embla image carousel
│   │       ├── CurrentWeatherSection.tsx  # Live weather display
│   │       ├── EntranceFeesSection.tsx    # Collapsible fee list
│   │       ├── OperatingHoursSection.tsx  # Collapsible hours/exceptions
│   │       ├── ParkSearch.tsx         # Search with dropdown
│   │       └── ParkTypeFilter.tsx     # Type filter with groups
│   └── api/                      # API routes
│       ├── parks/                # Park data endpoints
│       │   ├── search/           # Name search
│       │   └── [code]/           # Single park detail + weather
│       └── cron/sync-parks/      # Monthly data sync
├── lib/
│   ├── config/map.ts             # Tile URLs, colors, default viewport
│   ├── constants/national-parks.ts  # Canonical 63 National Park codes
│   ├── data/                     # Data access layer
│   │   ├── parks.ts              # Park boundary + detail queries (PostGIS)
│   │   ├── weather.ts            # WeatherAPI.com client
│   │   └── nps-api.ts            # NPS API client (seed/sync)
│   └── db/index.ts               # Neon serverless client
├── types/                        # Shared TypeScript types
│   ├── park.ts                   # Park, weather, and search types
│   └── map.ts                    # Map viewport and style types
├── test/                         # Test utilities and fixtures
│   ├── fixtures.ts               # Mock data factories
│   └── setup.ts                  # Vitest setup (jest-dom matchers)
scripts/                          # Database seed scripts
├── seed-boundaries.ts            # Load GeoJSON into PostGIS
└── seed-details.ts               # Cache NPS API metadata
docs/                             # Project documentation
├── architecture.md               # Full architecture reference
└── national-parks-comparison.md  # Park data comparison notes
```

### Data Flow

1. **Seed Scripts** — Load park boundary GeoJSON and NPS API metadata into a Neon PostGIS database
2. **API Routes** — Query PostGIS for boundaries (`/api/parks`), details (`/api/parks/[code]`), search (`/api/parks/search`), and weather (`/api/parks/[code]/weather`)
3. **Data Layer** (`lib/data/`) — Typed data access functions for all database and external API calls
4. **Components** — Consume data via API fetch calls, never query the database directly

## Testing

The project uses [Vitest](https://vitest.dev) with [Testing Library](https://testing-library.com) for comprehensive unit testing. Every component, API route, and data layer function has a colocated test file.

```bash
pnpm test              # Single run
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
```

Test fixtures are provided in `src/test/fixtures.ts` with factory functions for creating mock park details, images, entrance fees, operating hours, weather data, and more.

## Documentation

See [docs/architecture.md](docs/architecture.md) for the full architecture reference including database schema, API specifications, component tree, caching strategy, and deployment checklist.

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run Biome linter |
| `pnpm lint:fix` | Run Biome linter with auto-fix |
| `pnpm format` | Format code with Biome |
| `pnpm test` | Run tests (single run) |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm seed` | Seed park boundaries and details |
