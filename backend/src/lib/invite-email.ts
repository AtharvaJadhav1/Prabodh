import {
  appOrigin,
  emailOtpButton,
  escapeHtml,
  renderEmail,
  renderEmailHtml,
} from '../modules/notifications/templates/render';
import { resolveInviteFromAddress, sendTransactionalEmail } from './resend';

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
  if (role === 'student_expert') return 'Student Expert';
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
  const bodyHtml = `
    <p style="margin:0 0 12px">Hello ${safeName},</p>
    <p style="margin:0 0 12px">Your administrator created a Prabodh <strong>${escapeHtml(label)}</strong> account for you.</p>
    <p style="margin:16px 0 8px;font-size:13px;color:#706761">Sign in with these credentials:</p>
    <p style="margin:0 0 4px;font-size:13px;color:#706761">Email</p>
    <p style="margin:0 0 16px;font-family:ui-monospace,Consolas,monospace;font-size:15px;font-weight:700;color:#2B2523">${safeEmail}</p>
    <p style="margin:0 0 8px;font-size:13px;color:#706761">Your password — click to copy</p>
    <div style="text-align:center;margin:8px 0 16px">${emailOtpButton(opts.password)}</div>
    <p style="margin:0;font-size:13px;color:#706761">Use <strong>Switch account / Sign in</strong> if another Prabodh session is still open in this browser.</p>
  `;
  const html = renderEmailHtml('staff_credentials', title, bodyHtml, 'Sign in to Prabodh', loginUrl);
  const from = resolveInviteFromAddress();
  return sendTransactionalEmail({ to: opts.to, subject: title, html, from });
}
