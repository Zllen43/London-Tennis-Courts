import { query } from '../db.js';
import { SLOT_STATUS } from '../constants.js';

export async function getLatestSlotStatus(courtId, startTime, endTime) {
  const result = await query(
    'SELECT status FROM slot_snapshots WHERE court_id = $1 AND start_time = $2 AND end_time = $3 ORDER BY captured_at DESC LIMIT 1',
    [courtId, startTime, endTime]
  );
  return result.rows[0]?.status || null;
}

export function shouldNotify({ previousStatus, newStatus }) {
  return previousStatus === SLOT_STATUS.FULL && newStatus === SLOT_STATUS.AVAILABLE;
}

export async function saveSlotSnapshot(courtId, slot) {
  await query(
    'INSERT INTO slot_snapshots (court_id, start_time, end_time, status, booking_url, captured_at) VALUES ($1, $2, $3, $4, $5, NOW())',
    [courtId, slot.start_time, slot.end_time, slot.status, slot.booking_url]
  );
}
