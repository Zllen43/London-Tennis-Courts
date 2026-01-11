import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import pinoHttp from 'pino-http';
import { z } from 'zod';
import { query } from './db.js';
import { logger } from './logger.js';
import { lookupPostcode, haversineDistance } from './services/geo.js';
import { getProvider } from './providers/index.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: Number(process.env.RATE_LIMIT || 60),
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
  app.use(pinoHttp({ logger }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/geo/postcode', async (req, res) => {
    const schema = z.object({ postcode: z.string().min(3) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid postcode' });
    }
    const result = await lookupPostcode(parsed.data.postcode);
    if (!result) {
      return res.status(400).json({ error: 'Postcode not found' });
    }
    return res.json(result);
  });

  app.get('/api/courts', async (req, res) => {
    const schema = z.object({ lat: z.string(), lng: z.string() });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Missing lat/lng' });
    }
    const lat = Number(parsed.data.lat);
    const lng = Number(parsed.data.lng);
    const courts = await query('SELECT * FROM courts');
    const enriched = courts.rows
      .map((court) => ({
        ...court,
        distance_km: haversineDistance(lat, lng, court.lat, court.lng),
      }))
      .sort((a, b) => a.distance_km - b.distance_km);
    return res.json({ courts: enriched });
  });

  app.get('/api/courts/:id/availability', async (req, res) => {
    const { id } = req.params;
    const from = req.query.from;
    const to = req.query.to;
    if (!from || !to) {
      return res.status(400).json({ error: 'Missing from/to' });
    }
    const courtResult = await query('SELECT * FROM courts WHERE id = $1', [id]);
    if (!courtResult.rows[0]) {
      return res.status(404).json({ error: 'Court not found' });
    }
    const court = courtResult.rows[0];
    const provider = getProvider(court.provider);
    const slots = await provider.fetchAvailability(court, from, to);
    return res.json({ slots });
  });

  app.post('/api/alerts', async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      court_id: z.string(),
      slots: z
        .array(
          z.object({
            start_time: z.string(),
            end_time: z.string(),
          })
        )
        .min(1),
      honeypot: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    if (parsed.data.honeypot) {
      return res.status(400).json({ error: 'Spam detected' });
    }
    const token = uuidv4();
    const created = [];
    for (const slot of parsed.data.slots) {
      const result = await query(
        `INSERT INTO alert_subscriptions (email, court_id, start_time, end_time, verified_at, active, token)
         VALUES ($1, $2, $3, $4, NOW(), TRUE, $5)
         RETURNING id`,
        [parsed.data.email, parsed.data.court_id, slot.start_time, slot.end_time, token]
      );
      created.push(result.rows[0]);
    }
    return res.json({ token, created_count: created.length });
  });

  app.get('/api/alerts/manage/:token', async (req, res) => {
    const { token } = req.params;
    const subs = await query(
      `SELECT alert_subscriptions.*, courts.name AS court_name, courts.booking_base_url
       FROM alert_subscriptions
       JOIN courts ON courts.id = alert_subscriptions.court_id
       WHERE token = $1 AND active = TRUE
       ORDER BY start_time`,
      [token]
    );
    if (subs.rowCount === 0) {
      return res.status(404).json({ error: 'No active subscriptions' });
    }
    return res.json({ subscriptions: subs.rows });
  });

  app.delete('/api/alerts/manage/:token/:subscriptionId', async (req, res) => {
    const { token, subscriptionId } = req.params;
    await query('DELETE FROM alert_subscriptions WHERE id = $1 AND token = $2', [
      subscriptionId,
      token,
    ]);
    return res.json({ status: 'deleted' });
  });

  app.delete('/api/alerts/manage/:token', async (req, res) => {
    const { token } = req.params;
    await query('DELETE FROM alert_subscriptions WHERE token = $1', [token]);
    return res.json({ status: 'deleted_all' });
  });

  app.post('/api/suggestions', async (req, res) => {
    const schema = z.object({
      message: z.string().min(5),
      email: z.string().email().optional().or(z.literal('')),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid suggestion' });
    }
    await query('INSERT INTO suggestions (email, message) VALUES ($1, $2)', [
      parsed.data.email || null,
      parsed.data.message,
    ]);
    return res.json({ status: 'received' });
  });

  return app;
}
