import { Resend } from 'resend';

export function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function resolveFromAddress() {
  const from = (process.env.RESEND_FROM_EMAIL ?? '').trim();
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not set on the backend');
  }
  if (/example\.com|localhost/i.test(from)) {
    throw new Error(
      `RESEND_FROM_EMAIL is still a placeholder (${from}). Use a verified domain, e.g. SIH Portal <noreply@prabodh.app>`,
    );
  }
  return from;
}

export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<string> {
  const resend = getResend();
  if (!resend) {
    throw new Error('RESEND_API_KEY is not set on the backend');
  }
  const from = resolveFromAddress();
  const { data, error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (error) {
    console.error('[email] Resend rejected send', { to: opts.to, from, error });
    throw new Error(error.message);
  }
  if (!data?.id) {
    throw new Error('Resend returned no message id');
  }
  console.log('[email] sent', { to: opts.to, from, id: data.id });
  return data.id;
}
