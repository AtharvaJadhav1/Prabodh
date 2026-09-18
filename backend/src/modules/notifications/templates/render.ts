export type EmailTemplate =
  | 'mentor_allocation'
  | 'team_invite'
  | 'deadline_reminder'
  | 'evaluation_published'
  | 'admin_broadcast'
  | 'status_change'
  | 'ps_review'
  | 'join_request'
  | 'join_request_outcome';

function layout(title: string, bodyHtml: string, ctaLabel = 'Open Prabodh', ctaUrl?: string) {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_ORIGIN ?? 'http://localhost:3000';
  const origin = raw.split(',')[0].trim();
  const href = ctaUrl ?? origin;
  return `<!doctype html>
<html>
  <body style="margin:0;background:#0f172a;font-family:Segoe UI,Roboto,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 0">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px">
          <tr><td style="font-size:13px;letter-spacing:.08em;color:#64748b;text-transform:uppercase">Prabodh</td></tr>
          <tr><td style="padding-top:12px;font-size:22px;font-weight:700">${escapeHtml(title)}</td></tr>
          <tr><td style="padding-top:16px;font-size:15px;line-height:1.6;color:#334155">${bodyHtml}</td></tr>
          <tr><td style="padding-top:24px">
            <a href="${href}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block">${ctaLabel}</a>
          </td></tr>
          <tr><td style="padding-top:28px;font-size:12px;color:#94a3b8">Scores and sensitive evaluation data are only shown after you sign in.</td></tr>
        </table>
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
  const safe = `<p>${escapeHtml(body)}</p>`;
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
  switch (template) {
    case 'team_invite':
      return layout(
        title,
        `${bodyHtml}<p>Use the same email address when you register so your invite is linked automatically.</p>`,
        ctaLabel ?? 'Register & join team',
        ctaUrl,
      );
    case 'mentor_allocation':
      return layout(
        title,
        `${bodyHtml}<p>Open Prabodh and sign in with the email above to continue.</p>`,
        ctaLabel ?? 'Open mentor dashboard',
        ctaUrl,
      );
    case 'deadline_reminder':
      return layout(title, `${bodyHtml}<p>Submit deliverables before the stage locks.</p>`);
    case 'evaluation_published':
      return layout(title, `${bodyHtml}<p>Sign in to view scores and feedback. Scores are not included in this email.</p>`);
    case 'admin_broadcast':
      return layout(title, bodyHtml, 'Read announcement');
    case 'status_change':
      return layout(title, `${bodyHtml}<p>Check the status tracker for the latest stage outcome.</p>`);
    case 'ps_review':
      return layout(
        title,
        `${bodyHtml}<p>Open your PS Approvals page to review the ranked preferences and lock one problem statement for this team.</p>`,
        ctaLabel ?? 'Open PS Approvals',
        ctaUrl,
      );
    case 'join_request':
      return layout(
        title,
        `${bodyHtml}<p>Open your Group Requests page to accept or reject this request.</p>`,
        ctaLabel ?? 'Review join request',
        ctaUrl,
      );
    case 'join_request_outcome':
      return layout(title, bodyHtml, ctaLabel ?? 'Open your dashboard', ctaUrl);
    default:
      return layout(title, bodyHtml);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}