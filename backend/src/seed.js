import dotenv from 'dotenv';
import { query } from './db.js';
import { providers } from './providers/index.js';

dotenv.config();

async function seedCourts() {
  for (const provider of Object.values(providers)) {
    const courts = await provider.listCourts();
    for (const court of courts) {
      await query(
        `INSERT INTO courts (id, name, provider, booking_base_url, borough, lat, lng, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           provider = EXCLUDED.provider,
           booking_base_url = EXCLUDED.booking_base_url,
           borough = EXCLUDED.borough,
           lat = EXCLUDED.lat,
           lng = EXCLUDED.lng,
           metadata = EXCLUDED.metadata`,
        [
          court.id,
          court.name,
          court.provider,
          court.booking_base_url,
          court.borough || null,
          court.lat,
          court.lng,
          court.metadata || {},
        ]
      );
    }
  }
}

async function seedSuggestion() {
  await query(
    'INSERT INTO suggestions (email, message) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    ['demo@example.com', 'Please add more courts in North London.']
  );
}

async function seed() {
  await seedCourts();
  await seedSuggestion();
  console.log('Seed complete');
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
