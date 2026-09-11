import { renderEmail } from '../modules/notifications/templates/render';
import { sendTransactionalEmail } from './resend';

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
  const body = `${opts.leaderName} invited you to join team ${opts.teamName} (${opts.teamCode}) on the SIH portal. Create an account or sign in with this email (${opts.to}) to accept the invite.`;
  const html = renderEmail('team_invite', title, body, 'Register & join team', registerUrl);
  return sendTransactionalEmail({ to: opts.to, subject: title, html });
}

export async function sendMentorInviteEmail(opts: {
  to: string;
  teamName: string;
  leaderName: string;
}) {
  const origin = appOrigin();
  const loginUrl = `${origin}/login/faculty`;
  const title = `Mentor invitation for ${opts.teamName}`;
  const body = `${opts.leaderName} invited you to mentor ${opts.teamName}. Sign in with this email to review and accept the request.`;
  const html = renderEmail('mentor_allocation', title, body, 'Review invitation', loginUrl);
  return sendTransactionalEmail({ to: opts.to, subject: title, html });
}
