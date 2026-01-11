import nodemailer from 'nodemailer';
import { logger } from '../logger.js';
import { query } from '../db.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailhog',
  port: Number(process.env.SMTP_PORT || 1025),
  secure: false,
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

export async function sendAvailabilityEmail({
  to,
  courtName,
  startTime,
  bookingUrl,
  manageUrl,
}) {
  const subject = `Court available: ${courtName} ${new Date(startTime).toLocaleString('en-GB')}`;
  const text = `Good news!\n\nCourt: ${courtName}\nTime: ${new Date(startTime).toLocaleString(
    'en-GB'
  )}\nBook now: ${bookingUrl}\nManage alerts: ${manageUrl}\n\nDisclaimer: This tool is unofficial. Availability is subject to the official booking system.`;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'alerts@londontenniscourts.com',
      to,
      subject,
      text,
    });

    await query(
      'INSERT INTO email_logs (to_email, subject, status, provider_message_id) VALUES ($1, $2, $3, $4)',
      [to, subject, 'SENT', info.messageId || null]
    );
    return { status: 'SENT', messageId: info.messageId };
  } catch (error) {
    logger.error({ error: error.message }, 'Email send failed');
    await query(
      'INSERT INTO email_logs (to_email, subject, status, provider_message_id) VALUES ($1, $2, $3, $4)',
      [to, subject, 'FAILED', null]
    );
    return { status: 'FAILED' };
  }
}
