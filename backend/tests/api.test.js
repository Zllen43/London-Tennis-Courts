import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { query } from '../src/db.js';

const hasDb = Boolean(process.env.DATABASE_URL);

if (!hasDb) {
  test('api tests skipped (DATABASE_URL not set)', { skip: true }, () => {});
} else {
  test('create and fetch alerts via manage token', async () => {
    const app = createApp();
    await query(
      `INSERT INTO courts (id, name, provider, booking_base_url, lat, lng)
       VALUES ('test-court', 'Test Court', 'mock', 'https://example.com', 51.5, 0.1)
       ON CONFLICT (id) DO NOTHING`
    );

    const createResponse = await request(app).post('/api/alerts').send({
      email: 'tester@example.com',
      court_id: 'test-court',
      slots: [
        {
          start_time: '2024-06-01T09:00:00Z',
          end_time: '2024-06-01T10:00:00Z',
        },
      ],
    });

    assert.equal(createResponse.status, 200);
    const token = createResponse.body.token;
    const manageResponse = await request(app).get(`/api/alerts/manage/${token}`);
    assert.equal(manageResponse.status, 200);
    assert.equal(manageResponse.body.subscriptions.length, 1);
  });
}
