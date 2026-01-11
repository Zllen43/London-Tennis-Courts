import { query } from '../db.js';
import { getProvider } from '../providers/index.js';
import { getLatestSlotStatus, saveSlotSnapshot, shouldNotify } from './availability.js';
import { sendAvailabilityEmail } from './email.js';
import { logger } from '../logger.js';

export async function pollCourt(court) {
  const provider = getProvider(court.provider);
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + Number(process.env.AVAILABILITY_DAYS || 7));
  const slots = await provider.fetchAvailability(court, from.toISOString(), to.toISOString());

  for (const slot of slots) {
    const previousStatus = await getLatestSlotStatus(court.id, slot.start_time, slot.end_time);
    await saveSlotSnapshot(court.id, slot);
    if (shouldNotify({ previousStatus, newStatus: slot.status })) {
      await triggerNotifications(court, slot);
    }
  }
}

export async function triggerNotifications(court, slot) {
  const subs = await query(
    `SELECT id, email, token, last_notified_at
     FROM alert_subscriptions
     WHERE court_id = $1
       AND start_time = $2
       AND end_time = $3
       AND active = TRUE`,
    [court.id, slot.start_time, slot.end_time]
  );

  const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
  for (const sub of subs.rows) {
    if (sub.last_notified_at) {
      continue;
    }
    const manageUrl = `${baseUrl}/manage/${sub.token}`;
    const result = await sendAvailabilityEmail({
      to: sub.email,
      courtName: court.name,
      startTime: slot.start_time,
      bookingUrl: slot.booking_url,
      manageUrl,
    });

    if (result.status === 'SENT') {
      await query('UPDATE alert_subscriptions SET last_notified_at = NOW() WHERE id = $1', [sub.id]);
    }
  }
}

export async function pollAllCourts() {
  const courtsResult = await query('SELECT * FROM courts');
  for (const court of courtsResult.rows) {
    try {
      await pollCourt(court);
    } catch (error) {
      logger.error({ error: error.message, court: court.name }, 'Polling failed');
    }
  }
}

export async function cleanupSnapshots() {
  await query('DELETE FROM slot_snapshots WHERE captured_at < NOW() - INTERVAL \"30 days\"');
}
