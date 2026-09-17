import { renderEmail, renderEmailHtml } from '../modules/notifications/templates/render';
import { resolveInviteFromAddress, sendTransactionalEmail } from './resend';

function appOrigin() {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_ORIGIN ?? 'http://localhost:3000';
  return raw.split(',')[0].trim();
}

export async function sendTeamMemberInviteEmail(opts: {
  to: string;
  teamName: string;
  teamCode: string;
  leaderName: string;
}) {
  const origin = appOrigin();
  const registerUrl = `${origin}/register`;
  const title = `You're invited to join ${opts.teamName}`;
  const body = `${opts.leaderName} invited you to join team ${opts.teamName} (${opts.teamCode}) on Prabodh. Create an account or sign in with this email (${opts.to}) to accept the invitation.`;
  const html = renderEmail('team_invite', title, body, 'Accept invitation', registerUrl);
  const from = resolveInviteFromAddress();
  return sendTransactionalEmail({ to: opts.to, subject: title, html, from });
}

export async function sendMentorInviteEmail(opts: {
  to: string;
  teamName: string;
  leaderName: string;
}) {
  const origin = appOrigin();
  const loginUrl = `${origin}/login`;
  const title = `Mentor invitation for ${opts.teamName}`;
  const body = `${opts.leaderName} invited you to mentor ${opts.teamName} on Prabodh. Sign in with this email to review and accept the invitation.`;
  const html = renderEmail('mentor_allocation', title, body, 'Review invitation', loginUrl);
  const from = resolveInviteFromAddress();
  return sendTransactionalEmail({ to: opts.to, subject: title, html, from });
}

function roleLabel(role: string) {
  if (role === 'admin') return 'Administrator';
  if (role === 'industry_mentor') return 'Industry Mentor';
  return 'Institute Mentor';
}

export async function sendStaffCredentialsEmail(opts: {
  to: string;
  fullName: string;
  password: string;
  platformRole: string;
}) {
  const origin = appOrigin();
  const loginUrl = `${origin}/login?switch=1&email=${encodeURIComponent(opts.to)}`;
  const label = roleLabel(opts.platformRole);
  const title = `Your Prabodh ${label} account`;
  const safeName = escapeHtml(opts.fullName);
  const safeEmail = escapeHtml(opts.to);
  const safePassword = escapeHtml(opts.password);
  const bodyHtml = `
    <p>Hello ${safeName},</p>
    <p>Your administrator created a Prabodh <strong>${escapeHtml(label)}</strong> account for you.</p>
    <p style="margin:16px 0 8px;font-size:13px;color:#64748b">Sign in with these exact credentials:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
      <tr><td style="padding:12px 16px;font-size:13px;color:#64748b">Email</td></tr>
      <tr><td style="padding:0 16px 12px;font-family:ui-monospace,Consolas,monospace;font-size:15px;font-weight:700;color:#0f172a">${safeEmail}</td></tr>
      <tr><td style="padding:0 16px 4px;font-size:13px;color:#64748b">Temporary password</td></tr>
      <tr><td style="padding:0 16px 14px;font-family:ui-monospace,Consolas,monospace;font-size:15px;font-weight:700;letter-spacing:0.02em;color:#0f172a">${safePassword}</td></tr>
    </table>
    <p style="margin-top:16px;font-size:13px;color:#64748b">Use <strong>Switch account / Sign in</strong> if another Prabodh session is still open in this browser. Copy the password carefully (no extra spaces).</p>
  `;
  const html = renderEmailHtml('mentor_allocation', title, bodyHtml, 'Sign in to Prabodh', loginUrl);
  const from = resolveInviteFromAddress();
  return sendTransactionalEmail({ to: opts.to, subject: title, html, from });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}
