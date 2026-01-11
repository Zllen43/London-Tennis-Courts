import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseClubSparkSlots } from '../src/providers/clubSparkProvider.js';
import { SLOT_STATUS } from '../src/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('parseClubSparkSlots returns standardized slots', async () => {
  const fixture = await fs.readFile(path.join(__dirname, 'fixtures', 'clubspark.html'), 'utf8');
  const slots = parseClubSparkSlots(fixture, 'https://clubspark.test/book');
  assert.equal(slots.length, 2);
  assert.equal(slots[0].status, SLOT_STATUS.AVAILABLE);
  assert.equal(slots[1].status, SLOT_STATUS.FULL);
  assert.ok(slots[0].booking_url.includes('clubspark.test'));
});
