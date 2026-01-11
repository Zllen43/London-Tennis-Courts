import axios from 'axios';
import { logger } from '../logger.js';

const cache = new Map();

export async function lookupPostcode(postcode) {
  const normalized = postcode.trim().toUpperCase();
  if (cache.has(normalized)) {
    return cache.get(normalized);
  }
  try {
    const response = await axios.get(`https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`, {
      timeout: 6000,
    });
    if (response.data?.status !== 200) {
      return null;
    }
    const result = {
      lat: response.data.result.latitude,
      lng: response.data.result.longitude,
    };
    cache.set(normalized, result);
    return result;
  } catch (error) {
    logger.warn({ error: error.message, postcode }, 'Postcode lookup failed');
    return null;
  }
}

export function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
