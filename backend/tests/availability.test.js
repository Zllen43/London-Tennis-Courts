import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldNotify } from '../src/services/availability.js';
import { SLOT_STATUS } from '../src/constants.js';

test('shouldNotify only triggers on FULL to AVAILABLE', () => {
  assert.equal(
    shouldNotify({ previousStatus: SLOT_STATUS.FULL, newStatus: SLOT_STATUS.AVAILABLE }),
    true
  );
  assert.equal(
    shouldNotify({ previousStatus: SLOT_STATUS.AVAILABLE, newStatus: SLOT_STATUS.AVAILABLE }),
    false
  );
  assert.equal(
    shouldNotify({ previousStatus: SLOT_STATUS.FULL, newStatus: SLOT_STATUS.CLOSED }),
    false
  );
});
