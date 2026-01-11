import axios from 'axios';
import { SLOT_STATUS } from '../constants.js';
import { logger } from '../logger.js';

const USER_AGENT = 'LondonTennisCourtAlerts/0.1 (+https://www.londontenniscourts.com/)';
let lastRequestAt = 0;

async function rateLimit() {
  const now = Date.now();
  const waitMs = Math.max(0, 1200 - (now - lastRequestAt));
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRequestAt = Date.now();
}

export function parseClubSparkSlots(html, bookingBaseUrl) {
  const slots = [];
  const regex = /data-slot="(.*?)"/g;
  let match;
  while ((match = regex.exec(html))) {
    const payload = match[1];
    try {
      const data = JSON.parse(payload);
      const status = data.status === 'available' ? SLOT_STATUS.AVAILABLE : SLOT_STATUS.FULL;
      slots.push({
        start_time: new Date(data.start).toISOString(),
        end_time: new Date(data.end).toISOString(),
        status,
        booking_url: `${bookingBaseUrl}?start=${encodeURIComponent(data.start)}`,
      });
    } catch (error) {
      logger.warn({ error: error.message }, 'Unable to parse ClubSpark slot');
    }
  }
  return slots;
}

async function fetchHtml(url) {
  await rateLimit();
  const response = await axios.get(url, {
    headers: {
      'User-Agent': USER_AGENT,
    },
    timeout: 8000,
  });
  return response.data;
}

export const clubSparkProvider = {
  key: 'clubSpark',
  label: 'ClubSpark (template)',
  async listCourts() {
    return [
      {
        id: 'clubspark-1',
        name: 'Ridgeway Park Courts',
        borough: 'Merton',
        provider: 'clubSpark',
        booking_base_url: 'https://clubspark.lta.org.uk/Book/RidgewayPark',
        lat: 51.4109,
        lng: -0.1983,
        metadata: {
          availability_url: 'https://clubspark.lta.org.uk/Book/RidgewayPark/Availability',
        },
      },
    ];
  },
  async fetchAvailability(court, from, to) {
    const url = court.metadata?.availability_url;
    if (!url) {
      return [];
    }
    try {
      const html = await fetchHtml(url);
      return parseClubSparkSlots(html, court.booking_base_url);
    } catch (error) {
      logger.warn({ error: error.message, url }, 'ClubSpark fetch failed; returning empty');
      return [];
    }
  },
};
