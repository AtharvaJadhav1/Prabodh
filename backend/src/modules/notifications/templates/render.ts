export type EmailTemplate =
  | 'mentor_allocation'
  | 'deadline_reminder'
  | 'evaluation_published'
  | 'admin_broadcast'
  | 'status_change';

function layout(title: string, bodyHtml: string, ctaLabel = 'Open SIH Portal') {
  const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000';
  return `<!doctype html>
<html>
  <body style="margin:0;background:#0f172a;font-family:Segoe UI,Roboto,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 0">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px">
          <tr><td style="font-size:13px;letter-spacing:.08em;color:#64748b;text-transform:uppercase">SIH Team Portal</td></tr>
          <tr><td style="padding-top:12px;font-size:22px;font-weight:700">${escapeHtml(title)}</td></tr>
          <tr><td style="padding-top:16px;font-size:15px;line-height:1.6;color:#334155">${bodyHtml}</td></tr>
          <tr><td style="padding-top:24px">
            <a href="${origin}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block">${ctaLabel}</a>
          </td></tr>
          <tr><td style="padding-top:28px;font-size:12px;color:#94a3b8">Scores and sensitive evaluation data are only shown after you sign in.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function renderEmail(template: EmailTemplate, title: string, body: string) {
  const safe = `<p>${escapeHtml(body)}</p>`;
  switch (template) {
    case 'mentor_allocation':
      return layout(title, `${safe}<p>Open your mentor dashboard to review the assigned team.</p>`);
    case 'deadline_reminder':
      return layout(title, `${safe}<p>Submit deliverables before the stage locks.</p>`);
    case 'evaluation_published':
      return layout(title, `${safe}<p>Sign in to view scores and feedback. Scores are not included in this email.</p>`);
    case 'admin_broadcast':
      return layout(title, safe, 'Read announcement');
    case 'status_change':
      return layout(title, `${safe}<p>Check the status tracker for the latest stage outcome.</p>`);
    default:
      return layout(title, safe);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}