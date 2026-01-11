# London Tennis Court Alerts (MVP)

An MVP service that monitors London tennis courts, detects cancellations, and emails alerts with direct booking links.

## Features
- Postcode lookup + distance sorting
- Availability grid for the next 7 days
- Click red slots to subscribe to alerts
- Manage/unsubscribe alerts via tokenized link
- Suggestions form stored in DB
- Plugin-based providers (mock + ClubSpark template)
- Background polling worker with change detection
- Email delivery via SMTP (MailHog for local dev)

## Local development (Docker)

```bash
docker compose up --build
```

Then run migrations + seed data in a separate terminal:

```bash
docker compose exec api node src/migrate.js
docker compose exec api node src/seed.js
```

Visit:
- Frontend: http://localhost:5173
- API health: http://localhost:4000/health
- MailHog inbox: http://localhost:8025

## Local development (without Docker)

1. Start PostgreSQL locally and create a database.
2. Create `.env` in `backend/` based on `.env.example`.
3. Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
```

4. Run migrations + seed:

```bash
cd backend
node src/migrate.js
node src/seed.js
```

5. Start services:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

## Environment variables

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/london_tennis
PORT=4000
BASE_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=alerts@londontenniscourts.com
RATE_LIMIT=60
POLL_INTERVAL_MS=120000
AVAILABILITY_DAYS=7
```

## Adding a new provider

1. Create a new provider file in `backend/src/providers` with the interface:

```js
export const yourProvider = {
  key: 'yourKey',
  label: 'Your Provider',
  async listCourts() {
    return [
      {
        id: 'provider-court-id',
        name: 'Court Name',
        borough: 'Borough',
        provider: 'yourKey',
        booking_base_url: 'https://provider.example/book',
        lat: 51.5,
        lng: -0.1,
        metadata: {
          availability_url: 'https://provider.example/availability'
        }
      }
    ];
  },
  async fetchAvailability(court, from, to) {
    return [
      {
        start_time: new Date(from).toISOString(),
        end_time: new Date(to).toISOString(),
        status: 'FULL',
        booking_url: court.booking_base_url
      }
    ];
  }
};
```

2. Register it in `backend/src/providers/index.js`.
3. Run `node src/seed.js` to persist courts.

### ClubSpark template notes
The `clubSparkProvider` includes a lightweight HTML parser for slots and a placeholder URL. Real ClubSpark pages often require authentication and may change markup. Update `metadata.availability_url` and parsing logic in `backend/src/providers/clubSparkProvider.js` when integrating a specific venue.

## Tests

```bash
cd backend
npm test
```

## Compliance & Disclaimer
- This tool is **unofficial** and may not reflect real-time availability. Always confirm on the official booking provider.
- Alerts are tied to a tokenized manage link; users can delete individual alerts or all data from the manage page.
- Postcode lookups use `postcodes.io` with in-memory caching.
