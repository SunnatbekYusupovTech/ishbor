import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '@/config/env';

/**
 * Password-reset codes are sent via plain Gmail SMTP + an App Password —
 * deliberately not a transactional-email provider (Resend/SendGrid/Brevo).
 * Those require verifying a sending domain before they'll deliver to
 * arbitrary recipients, which this project doesn't have. Gmail SMTP needs
 * nothing but a Gmail account with 2-Step Verification + an App Password
 * (myaccount.google.com/apppasswords) and works immediately for any
 * recipient. Google's send limit is ~500 messages/day on a normal Gmail
 * account — far more than a password-reset flow for a project this size
 * will ever use; if that ever becomes the bottleneck, swap this file for a
 * provider SDK without touching any caller (`sendPasswordResetEmail` is the
 * only exported surface).
 */
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.smtp.user || !env.smtp.appPassword) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: env.smtp.user, pass: env.smtp.appPassword },
    });
  }
  return transporter;
}

/** True once `SMTP_USER`/`SMTP_APP_PASSWORD` are configured — callers use this to fail fast with a clear message. */
export function isMailerConfigured(): boolean {
  return !!(env.smtp.user && env.smtp.appPassword);
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  const t = getTransporter();
  if (!t) throw new Error('Mailer is not configured (SMTP_USER/SMTP_APP_PASSWORD missing).');

  await t.sendMail({
    from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
    to,
    subject: `${code} — Ishbor parolni tiklash kodi`,
    text: `Sizning parolni tiklash kodingiz: ${code}\n\nKod 15 daqiqa amal qiladi. Agar bu so'rovni siz yubormagan bo'lsangiz, xabarni e'tiborsiz qoldiring.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="margin-bottom: 4px;">Parolni tiklash</h2>
        <p style="color: #555;">Ishbor akkauntingiz uchun tasdiqlash kodi:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; margin: 16px 0;">${code}</p>
        <p style="color: #888; font-size: 13px;">Kod 15 daqiqa amal qiladi. Agar bu so'rovni siz yubormagan bo'lsangiz, xabarni e'tiborsiz qoldiring.</p>
      </div>
    `,
  });
}
