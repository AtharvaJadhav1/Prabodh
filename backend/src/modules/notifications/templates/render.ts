/**
 * Shared Prabodh transactional email shell.
 * Every outbound email uses this layout so branding, header, and buttons stay uniform.
 */

export type EmailTemplate =
  | 'mentor_allocation'
  | 'team_invite'
  | 'evaluation_published'
  | 'admin_broadcast'
  | 'status_change'
  | 'ps_review'
  | 'join_request'
  | 'join_request_outcome'
  | 'otp'
  | 'staff_credentials'
  | 'role_granted';

const BRAND = {
  deep: '#5B2E10',
  primary: '#D96B27',
  hover: '#BE581A',
  cream: '#FAF8F5',
  canvas: '#F6F3EE',
  sand: '#EBE3D7',
  softline: '#E2D8CC',
  muted: '#706761',
  charcoal: '#2B2523',
  white: '#FFFFFF',
} as const;

export function appOrigin() {
  // Prefer configured public web origin. Never fall back to localhost in deployed
  // emails — that makes Sign-in CTAs unusable for real recipients.
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_ORIGIN ??
    process.env.FRONTEND_ORIGIN ??
    'https://incubation.prabodh.app';
  const first = raw.split(',')[0].trim().replace(/\/$/, '');
  if (!first || /localhost|127\.0\.0\.1/i.test(first)) {
    return 'https://incubation.prabodh.app';
  }
  return first;
}

/**
 * Public HTTPS URL of the email header logo.
 *
 * Hosted (never attached or inlined) so Gmail does not surface it as a
 * downloadable attachment chip and no Base64 bloats the payload. The URL lives
 * on the same registrable domain as the sender (`prabodh.app`) to keep sender
 * alignment/trust. Override with EMAIL_LOGO_URL when the asset moves.
 */
export const EMAIL_LOGO_URL =
  (process.env.EMAIL_LOGO_URL ?? '').trim() ||
  `${appOrigin()}/images/logo/prabodh-email-logo.png`;

export function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

/** Primary CTA — same visual language on every mail format. */
export function emailCtaButton(label: string, href: string) {
  return `<a href="${escapeHtml(href)}" style="background:${BRAND.primary};color:${BRAND.white};text-decoration:none;padding:14px 28px;border-radius:10px;display:inline-block;font-size:15px;font-weight:700;letter-spacing:0.01em;line-height:1.2;border:0;mso-padding-alt:0">${escapeHtml(label)}</a>`;
}

/**
 * OTP / secret code block — plain selectable text, deliberately not a link.
 * Email clients execute no JavaScript and block clipboard access, so an <a> wrapper
 * could only ever redirect the reader off the mail instead of copying anything.
 * Outlook's Word engine ignores `display:inline-block` and `user-select`, so it gets a
 * padded table via conditional comments; every other client gets the selectable div.
 * Generous padding keeps drag-selection forgiving, since the code has to be
 * selected by hand. Note `letter-spacing` makes Outlook append a trailing space on
 * copy, which callers already tolerate (OtpAuthFlow strips non-digits, LoginPasswordForm trims).
 */
export function emailCodeBlock(secret: string, opts?: { caption?: string }) {
  const safe = escapeHtml(secret);
  const caption = escapeHtml(opts?.caption ?? 'Copy this code to continue');
  return `<div style="text-align:center;margin:8px 0 16px">
<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto"><tr><td align="center" style="padding:16px 28px;background:${BRAND.cream};border:1px solid ${BRAND.sand};font-family:'Courier New',Courier,monospace;font-size:26px;font-weight:bold;letter-spacing:0.28em;color:${BRAND.charcoal};line-height:1.2;mso-line-height-rule:exactly">${safe}</td></tr></table><![endif]-->
<!--[if !mso]><!--><div style="display:inline-block;padding:16px 28px;background:${BRAND.cream};border:1px solid ${BRAND.sand};border-radius:10px;-webkit-user-select:all;user-select:all;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:26px;font-weight:700;letter-spacing:0.28em;line-height:1.2;color:${BRAND.charcoal}">${safe}</div><!--<![endif]-->
<p style="margin:10px 0 0;font-size:12px;color:${BRAND.muted}">${caption}</p>
</div>`;
}

export type LayoutOptions = {
  title: string;
  bodyHtml: string;
  /** Primary action button (omitted for OTP-only mails that embed their own code block). */
  cta?: { label: string; url: string };
  /** Extra block rendered between body and CTA (e.g. the OTP code block). */
  middleHtml?: string;
  /** Replaces the default "Yours sincerely, The Prabodh Team" closing (plain text). */
  signOff?: string;
  footerNote?: string;
  /** Letter salutation, e.g. "Dear Asha,". Defaults to "Dear User,". Pass false to omit. */
  greeting?: string | false;
};

const SUPPORT_EMAIL = 'support@prabodh.app';
const AUTOMATED_NOTE = 'This is an automated message.';

export function layout(opts: LayoutOptions) {
  const footer =
    opts.footerNote ??
    'This message was sent by Prabodh. Scores and sensitive evaluation data are shown only after you sign in.';
  const greeting =
    opts.greeting === false ? '' : `<p style="margin:0 0 14px">${escapeHtml(opts.greeting ?? 'Dear User,')}</p>`;
  const closing = opts.signOff
    ? `<tr><td style="padding:28px 32px 0;font-size:15px;line-height:1.65;color:${BRAND.charcoal}">
            <p style="margin:0;font-weight:700;color:${BRAND.deep}">${escapeHtml(opts.signOff)}</p>
          </td></tr>`
    : `<tr><td style="padding:28px 32px 0;font-size:15px;line-height:1.65;color:${BRAND.charcoal}">
            <p style="margin:0">Yours sincerely,</p>
            <p style="margin:0;font-weight:700;color:${BRAND.deep}">The Prabodh Team</p>
          </td></tr>`;
  const ctaBlock = opts.cta
    ? `<tr><td align="center" style="padding-top:28px">${emailCtaButton(opts.cta.label, opts.cta.url)}</td></tr>`
    : '';
  const middleBlock = opts.middleHtml
    ? `<tr><td align="center" style="padding-top:24px">${opts.middleHtml}</td></tr>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(opts.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.canvas};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.charcoal}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.canvas};padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${BRAND.white};border-radius:16px;border:1px solid ${BRAND.softline};overflow:hidden">
          <!-- Header: Prabodh logo -->
          <tr><td align="center" style="padding:32px 32px 24px;background:${BRAND.cream}">
            <img src="${EMAIL_LOGO_URL}" width="180" height="42" alt="Prabodh Logo" style="display:block;width:180px;height:42px;max-width:100%;margin:0 auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;color:${BRAND.deep};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:42px" />
          </td></tr>
          <!-- Divider -->
          <tr><td style="padding:0 32px"><div style="height:1px;background:${BRAND.softline};line-height:1px;font-size:1px">&nbsp;</div></td></tr>
          <!-- Body -->
          <tr><td style="padding:28px 32px 8px">
            <div style="font-size:20px;font-weight:700;color:${BRAND.deep};line-height:1.3">${escapeHtml(opts.title)}</div>
            <div style="padding-top:14px;font-size:15px;line-height:1.65;color:${BRAND.charcoal}">${greeting}${opts.bodyHtml}</div>
          </td></tr>
          ${middleBlock}
          ${ctaBlock}
          ${closing}
          <!-- Footer -->
          <tr><td style="padding:28px 32px 32px">
            <div style="height:1px;background:${BRAND.softline};line-height:1px;font-size:1px;margin-bottom:18px">&nbsp;</div>
            <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.muted}">${escapeHtml(footer)}</p>
            <p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:${BRAND.muted}">${AUTOMATED_NOTE} Need help? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.muted};text-decoration:underline">${SUPPORT_EMAIL}</a>.</p>
          </td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:${BRAND.muted}">© Prabodh</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function renderEmail(
  template: EmailTemplate,
  title: string,
  body: string,
  ctaLabel?: string,
  ctaUrl?: string,
  recipientName?: string,
) {
  const safe = `<p style="margin:0 0 12px">${escapeHtml(body)}</p>`;
  return renderEmailHtml(template, title, safe, ctaLabel, ctaUrl, recipientName);
}

/** Like renderEmail, but body is trusted HTML (caller must escape user values). */
export function renderEmailHtml(
  template: EmailTemplate,
  title: string,
  bodyHtml: string,
  ctaLabel?: string,
  ctaUrl?: string,
  recipientName?: string,
) {
  const origin = appOrigin();
  const greeting = recipientName?.trim() ? `Dear ${recipientName.trim()},` : 'Dear User,';
  const cta = ctaLabel
    ? { label: ctaLabel, url: ctaUrl ?? origin }
    : undefined;

  switch (template) {
    case 'team_invite':
      return layout({
        title,
        greeting,
        bodyHtml: `${bodyHtml}<p style="margin:12px 0 0;color:${BRAND.muted};font-size:14px">Kindly use the same email address when you register so that your invitation is linked automatically.</p>`,
        cta: cta ?? { label: 'Register & join team', url: `${origin}/register` },
      });
    case 'mentor_allocation':
      return layout({
        title,
        greeting,
        bodyHtml: `${bodyHtml}<p style="margin:12px 0 0;color:${BRAND.muted};font-size:14px">Please sign in to Prabodh with the email address above to continue.</p>`,
        cta: cta ?? { label: 'Open mentor dashboard', url: `${origin}/login` },
      });
    case 'staff_credentials':
      return layout({
        title,
        greeting,
        bodyHtml,
        cta: cta ?? { label: 'Sign in to Prabodh', url: `${origin}/login?switch=1` },
        signOff: '- Team Prabodh',
        footerNote: 'Please keep this password confidential. You may change it after signing in.',
      });
    case 'role_granted':
      return layout({
        title,
        greeting,
        bodyHtml,
        cta: cta ?? { label: 'Sign in to Prabodh', url: `${origin}/login?switch=1` },
        footerNote: 'Your existing password keeps working — no change needed unless you use Forgot password.',
      });
    case 'evaluation_published':
      return layout({
        title,
        greeting,
        bodyHtml: `${bodyHtml}<p style="margin:12px 0 0;color:${BRAND.muted};font-size:14px">Please sign in to view your scores and feedback. Scores are not included in this email.</p>`,
        cta: cta ?? { label: 'Open Prabodh', url: origin },
      });
    case 'admin_broadcast':
      return layout({
        title,
        greeting,
        bodyHtml,
        cta: cta ?? { label: 'Read announcement', url: origin },
      });
    case 'status_change':
      return layout({
        title,
        greeting,
        bodyHtml: `${bodyHtml}<p style="margin:12px 0 0;color:${BRAND.muted};font-size:14px">Please refer to the status tracker for the latest stage outcome.</p>`,
        cta: cta ?? { label: 'Open Prabodh', url: origin },
      });
    case 'ps_review':
      return layout({
        title,
        greeting,
        bodyHtml: `${bodyHtml}<p style="margin:12px 0 0;color:${BRAND.muted};font-size:14px">Kindly open your PS Approvals page to review the ranked preferences and lock one problem statement for this team.</p>`,
        cta: cta ?? { label: 'Open PS Approvals', url: ctaUrl ?? `${origin}/dashboard/mentor` },
      });
    case 'join_request':
      return layout({
        title,
        greeting,
        bodyHtml: `${bodyHtml}<p style="margin:12px 0 0;color:${BRAND.muted};font-size:14px">Kindly open your Group Requests page to accept or reject this request.</p>`,
        cta: cta ?? { label: 'Review join request', url: ctaUrl ?? `${origin}/dashboard/student/group-requests` },
      });
    case 'join_request_outcome':
      return layout({
        title,
        greeting,
        bodyHtml,
        cta: cta ?? { label: 'Open your dashboard', url: ctaUrl ?? origin },
      });
    case 'otp':
      return layout({
        title,
        greeting,
        bodyHtml,
        middleHtml: undefined,
        footerNote: 'If you did not request this code, you can safely ignore this email.',
      });
    default:
      return layout({
        title,
        greeting,
        bodyHtml,
        cta: cta ?? { label: 'Open Prabodh', url: origin },
      });
  }
}

/**
 * OTP / verification emails — the only code mail format.
 * Copy is standardised across every purpose: same greeting, same lead sentence,
 * same code block, same expiry note, same closing. Callers only supply the lead.
 */
export function renderOtpEmail(opts: {
  title: string;
  /** One plain sentence describing what the code is for. */
  lead: string;
  code: string;
  expiresMinutes: number;
  recipientName?: string;
}) {
  const bodyHtml = `
    <p style="margin:0 0 12px">${escapeHtml(opts.lead)}</p>
    <p style="margin:0">Kindly enter this code in Prabodh to continue. Please note that it can be used only once.</p>
  `;
  return layout({
    title: opts.title,
    greeting: opts.recipientName?.trim() ? `Dear ${opts.recipientName.trim()},` : 'Dear User,',
    bodyHtml,
    middleHtml: emailCodeBlock(opts.code, { caption: 'Enter this code on the verification page' }),
    footerNote: `This code expires in ${opts.expiresMinutes} minutes. If you did not request this code, please disregard this email.`,
  });
}

/** Plain-text OTP body. Passing explicit text avoids HTML-only spam penalties on Gmail. */
export function renderOtpText(opts: {
  title: string;
  lead: string;
  code: string;
  expiresMinutes: number;
  recipientName?: string;
}): string {
  const greeting = opts.recipientName?.trim() ? `Dear ${opts.recipientName.trim()},` : 'Dear User,';
  return [
    `${greeting}`,
    ``,
    `${opts.title}`,
    `${opts.lead}`,
    `Kindly enter this code in Prabodh to continue. It can be used only once.`,
    ``,
    `Code: ${opts.code}`,
    `This code expires in ${opts.expiresMinutes} minutes. If you did not request this code, please disregard this email.`,
    ``,
    `Yours sincerely,`,
    `The Prabodh Team`,
  ].join('\n');
}
