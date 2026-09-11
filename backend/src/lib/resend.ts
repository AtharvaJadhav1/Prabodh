import { Resend } from 'resend';

export function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<string | null> {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL ?? 'SIH Portal <noreply@localhost>';
  if (!resend) {
    console.warn('[email] RESEND_API_KEY missing; skipping send to', opts.to);
    return null;
  }
  const { data, error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data?.id ?? null;
}
