import { renderEmail } from '../modules/notifications/templates/render';
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
  const loginUrl = `${origin}/login`;
  const label = roleLabel(opts.platformRole);
  const title = `Your Prabodh ${label} account`;
  const body = `Hello ${opts.fullName}, your administrator created a Prabodh ${label} account for you. Sign in using Email: ${opts.to} and Password: ${opts.password}. Use the same email on the sign-in page — you will be routed to the correct dashboard for your role.`;
  const html = renderEmail('mentor_allocation', title, body, 'Sign in to Prabodh', loginUrl);
  const from = resolveInviteFromAddress();
  return sendTransactionalEmail({ to: opts.to, subject: title, html, from });
}
