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
  const body = `We are pleased to inform you that ${opts.leaderName} has invited you to join team ${opts.teamName} (${opts.teamCode}) on Prabodh. To accept this invitation, kindly create an account or sign in using this email address (${opts.to}).`;
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
  const body = `${opts.leaderName} has requested your guidance as a mentor for team ${opts.teamName} on Prabodh. We would be grateful if you could sign in with this email address to review and respond to the invitation.`;
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

function dashboardPathForRole(role: string) {
  if (role === 'admin') return '/dashboard/admin';
  if (role === 'industry_mentor') return '/dashboard/industry';
  if (role === 'student_expert') return '/dashboard/expert';
  if (role === 'institute_mentor') return '/dashboard/mentor';
  return '/dashboard/student';
}

export async function sendStaffCredentialsEmail(opts: {
  to: string;
  fullName: string;
  password: string;
  platformRole: string;
}) {
  const origin = appOrigin();
  const next = dashboardPathForRole(opts.platformRole);
  const loginUrl =
    `${origin}/login?switch=1` +
    `&email=${encodeURIComponent(opts.to)}` +
    `&next=${encodeURIComponent(next)}`;
  const label = roleLabel(opts.platformRole);
  const title = `Your Prabodh ${label} account`;
  const safeEmail = escapeHtml(opts.to);
  const bodyHtml = `
    <p style="margin:0 0 12px">Your administrator has created a Prabodh <strong>${escapeHtml(label)}</strong> account for you.</p>
    <p style="margin:16px 0 8px;font-size:13px;color:#706761">Kindly sign in using the credentials below:</p>
    <p style="margin:0 0 4px;font-size:13px;color:#706761">Email</p>
    <p style="margin:0 0 16px;font-family:ui-monospace,Consolas,monospace;font-size:15px;font-weight:700;color:#2B2523">${safeEmail}</p>
    <p style="margin:0 0 8px;font-size:13px;color:#706761">Your password — click to copy, then continue to sign in</p>
    <div style="text-align:center;margin:8px 0 16px">${emailOtpButton(opts.password, { email: opts.to, next })}</div>
    <p style="margin:0;font-size:13px;color:#706761">If another Prabodh session is open in this browser, the sign-in link will switch accounts for you.</p>
  `;
  const html = renderEmailHtml('staff_credentials', title, bodyHtml, 'Sign in to Prabodh', loginUrl, opts.fullName);
  const from = resolveInviteFromAddress();
  return sendTransactionalEmail({ to: opts.to, subject: title, html, from });
}
