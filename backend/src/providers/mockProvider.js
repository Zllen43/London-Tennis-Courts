import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SLOT_STATUS } from '../constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, 'mock-data.json');

async function loadData() {
  const raw = await fs.readFile(dataPath, 'utf8');
  return JSON.parse(raw);
}

export const mockProvider = {
  key: 'mock',
  label: 'Mock Provider',
  async listCourts() {
    const data = await loadData();
    return data.courts;
  },
  async fetchAvailability(court, from, to) {
    const start = new Date(from);
    const end = new Date(to);
    const slots = [];
    const slotMinutes = 60;
    for (let date = new Date(start); date < end; date.setHours(date.getHours() + 1)) {
      const slotStart = new Date(date);
      const slotEnd = new Date(date);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotMinutes);
      const hour = slotStart.getUTCHours();
      let status = SLOT_STATUS.FULL;
      if (hour >= 7 && hour <= 20) {
        status = Math.random() > 0.7 ? SLOT_STATUS.AVAILABLE : SLOT_STATUS.FULL;
      } else {
        status = SLOT_STATUS.CLOSED;
      }
      slots.push({
        start_time: slotStart.toISOString(),
        end_time: slotEnd.toISOString(),
        status,
        booking_url: `${court.booking_base_url}?start=${slotStart.toISOString()}`,
      });
    }
    return slots;
  },
};
