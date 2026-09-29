/**
 * Shared Prabodh transactional email shell.
 * Every outbound email uses this layout so branding, header, and buttons stay uniform.
 */

export type EmailTemplate =
  | 'mentor_allocation'
  | 'team_invite'
  | 'deadline_reminder'
  | 'evaluation_published'
  | 'admin_broadcast'
  | 'status_change'
  | 'ps_review'
  | 'join_request'
  | 'join_request_outcome'
  | 'otp'
  | 'staff_credentials';

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
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_ORIGIN ?? 'http://localhost:3000';
  return raw.split(',')[0].trim().replace(/\/$/, '');
}

function logoUrl() {
  // Icon mark matches the circular logo in the email sketch.
  return `${appOrigin()}/images/logo/Prabodh_Icon_Only_Web_1000px.png`;
}

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
 * OTP / secret code button.
 * Click opens /auth/copy-otp#CODE (hash never hits the server) and copies in one click.
 * Also uses user-select:all so desktop clients can select the code with a single click.
 */
export function emailOtpButton(code: string) {
  const safe = escapeHtml(code);
  const href = `${appOrigin()}/auth/copy-otp#${encodeURIComponent(code)}`;
  return `<a href="${escapeHtml(href)}" style="background:${BRAND.primary};color:${BRAND.white};text-decoration:none;padding:16px 32px;border-radius:10px;display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:26px;font-weight:700;letter-spacing:0.28em;line-height:1.2;border:0;-webkit-user-select:all;user-select:all;mso-padding-alt:0" title="Click to copy">${safe}</a>
<p style="margin:10px 0 0;font-size:12px;color:${BRAND.muted}">Click the code to copy it</p>`;
}

export type LayoutOptions = {
  title: string;
  bodyHtml: string;
  /** Primary action button (omitted for OTP-only mails that embed their own button). */
  cta?: { label: string; url: string };
  /** Extra block rendered between body and CTA (e.g. OTP button). */
  middleHtml?: string;
  /** Small label under the brand wordmark (e.g. Student Portal). */
  portalLabel?: string;
  footerNote?: string;
};

export function layout(opts: LayoutOptions) {
  const portal = opts.portalLabel ?? 'Student Portal';
  const footer =
    opts.footerNote ??
    'This message was sent by Prabodh. Scores and sensitive evaluation data are only shown after you sign in.';
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
          <!-- Header: logo + Prabodh. -->
          <tr><td style="padding:28px 32px 20px;background:${BRAND.cream}">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:12px">
                  <img src="${logoUrl()}" width="40" height="40" alt="Prabodh" style="display:block;width:40px;height:40px;border-radius:999px;border:1px solid ${BRAND.sand};object-fit:cover" />
                </td>
                <td style="vertical-align:middle">
                  <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:${BRAND.deep};line-height:1.1">Prabodh.</div>
                  <div style="margin-top:4px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.muted}">${escapeHtml(portal)}</div>
                </td>
              </tr>
            </table>
          </td></tr>
          <!-- Divider -->
          <tr><td style="padding:0 32px"><div style="height:1px;background:${BRAND.softline};line-height:1px;font-size:1px">&nbsp;</div></td></tr>
          <!-- Body -->
          <tr><td style="padding:28px 32px 8px">
            <div style="font-size:20px;font-weight:700;color:${BRAND.deep};line-height:1.3">${escapeHtml(opts.title)}</div>
            <div style="padding-top:14px;font-size:15px;line-height:1.65;color:${BRAND.charcoal}">${opts.bodyHtml}</div>
          </td></tr>
          ${middleBlock}
          ${ctaBlock}
          <!-- Footer -->
          <tr><td style="padding:28px 32px 32px">
            <div style="height:1px;background:${BRAND.softline};line-height:1px;font-size:1px;margin-bottom:18px">&nbsp;</div>
            <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.muted}">${escapeHtml(footer)}</p>
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
) {
  const safe = `<p style="margin:0 0 12px">${escapeHtml(body)}</p>`;
  return renderEmailHtml(template, title, safe, ctaLabel, ctaUrl);
}

/** Like renderEmail, but body is trusted HTML (caller must escape user values). */
export function renderEmailHtml(
  template: EmailTemplate,
  title: string,
  bodyHtml: string,
  ctaLabel?: string,
  ctaUrl?: string,
) {
  const origin = appOrigin();
  const cta = ctaLabel
    ? { label: ctaLabel, url: ctaUrl ?? origin }
    : undefined;

  switch (template) {
    case 'team_invite':
      return layout({
        title,
        bodyHtml: `${bodyHtml}<p style="margin:12px 0 0;color:${BRAND.muted};font-size:14px">Use the same email address when you register so your invite is linked automatically.</p>`,
        cta: cta ?? { label: 'Register & join team', url: `${origin}/register` },
        portalLabel: 'Student Portal',
      });
    case 'mentor_allocation':
      return layout({
        title,
        bodyHtml: `${bodyHtml}<p style="margin:12px 0 0;color:${BRAND.muted};font-size:14px">Open Prabodh and sign in with the email above to continue.</p>`,
        cta: cta ?? { label: 'Open mentor dashboard', url: `${origin}/login` },
        portalLabel: 'Student Portal',
      });
    case 'staff_credentials':
      return layout({
        title,
        bodyHtml,
        cta: cta ?? { label: 'Sign in to Prabodh', url: `${origin}/login` },
        portalLabel: 'Student Portal',
        footerNote: 'Keep this password private. You can change it after signing in.',
      });
    case 'deadline_reminder':
      return layout({
        title,
        bodyHtml: `${bodyHtml}<p style="margin:12px 0 0;color:${BRAND.muted};font-size:14px">Submit deliverables before the stage locks.</p>`,
        cta: cta ?? { label: 'Open Prabodh', url: origin },
      });
    case 'evaluation_published':
      return layout({
        title,
        bodyHtml: `${bodyHtml}<p style="margin:12px 0 0;color:${BRAND.muted};font-size:14px">Sign in to view scores and feedback. Scores are not included in this email.</p>`,
        cta: cta ?? { label: 'Open Prabodh', url: origin },
      });
    case 'admin_broadcast':
      return layout({
        title,
        bodyHtml,
        cta: cta ?? { label: 'Read announcement', url: origin },
      });
    case 'status_change':
      return layout({
        title,
        bodyHtml: `${bodyHtml}<p style="margin:12px 0 0;color:${BRAND.muted};font-size:14px">Check the status tracker for the latest stage outcome.</p>`,
        cta: cta ?? { label: 'Open Prabodh', url: origin },
      });
    case 'ps_review':
      return layout({
        title,
        bodyHtml: `${bodyHtml}<p style="margin:12px 0 0;color:${BRAND.muted};font-size:14px">Open your PS Approvals page to review the ranked preferences and lock one problem statement for this team.</p>`,
        cta: cta ?? { label: 'Open PS Approvals', url: ctaUrl ?? `${origin}/dashboard/mentor` },
      });
    case 'join_request':
      return layout({
        title,
        bodyHtml: `${bodyHtml}<p style="margin:12px 0 0;color:${BRAND.muted};font-size:14px">Open your Group Requests page to accept or reject this request.</p>`,
        cta: cta ?? { label: 'Review join request', url: ctaUrl ?? `${origin}/dashboard/student/group-requests` },
      });
    case 'join_request_outcome':
      return layout({
        title,
        bodyHtml,
        cta: cta ?? { label: 'Open your dashboard', url: ctaUrl ?? origin },
      });
    case 'otp':
      return layout({
        title,
        bodyHtml,
        middleHtml: undefined,
        portalLabel: 'Student Portal',
        footerNote: 'If you did not request this code, you can safely ignore this email.',
      });
    default:
      return layout({
        title,
        bodyHtml,
        cta: cta ?? { label: 'Open Prabodh', url: origin },
      });
  }
}

/** OTP / verification emails — code is the primary button (one-click copy). */
export function renderOtpEmail(opts: {
  title: string;
  introHtml: string;
  code: string;
  expiresMinutes: number;
}) {
  const bodyHtml = `
    ${opts.introHtml}
    <p style="margin:16px 0 0;font-size:14px;color:${BRAND.muted}">This code expires in ${opts.expiresMinutes} minutes.</p>
  `;
  return layout({
    title: opts.title,
    bodyHtml,
    middleHtml: emailOtpButton(opts.code),
    portalLabel: 'Student Portal',
    footerNote: 'If you did not request this code, you can safely ignore this email.',
  });
}
