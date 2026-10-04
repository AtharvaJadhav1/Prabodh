/** Prepend https:// when the value has no scheme; returns "" for blank input. */
export function normalizeExternalUrl(raw: string | null | undefined): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
  return `https://${v.replace(/^\/\//, "")}`;
}

/** True only for http(s) URLs, so user-supplied values can never render as javascript: links. */
export function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Shorten a profile URL for display: strips the scheme and trailing slash, and when the host
 * matches `domain` reduces the rest to an @handle (e.g. "https://linkedin.com/in/neha" -> "@neha").
 */
export function handleFromUrl(url: string, domain: string): string {
  const cleaned = url.replace(/^https?:\/\//, "").replace(/^\//, "").replace(/\/$/, "");
  const prefix = `${domain}/`;
  return cleaned.toLowerCase().startsWith(prefix) ? `@${cleaned.slice(prefix.length)}` : cleaned;
}

export type SocialLink = { label: string; href: string };

const LINKEDIN_HOST = /linkedin\.com/i;

/** True for an entry in the old free-form links list that points at LinkedIn (in its href or its label). */
export function isLinkedinSocial(link: SocialLink): boolean {
  return LINKEDIN_HOST.test(link.href ?? "") || LINKEDIN_HOST.test(link.label ?? "");
}

/** The safe http(s) target of a free-form link, or "" when it has none (never a relative path). */
export function socialHref(link: SocialLink): string {
  const target = normalizeExternalUrl(link.href || (/^(https?:\/\/)?[^\s/]+\.[^\s/]+/i.test(link.label) ? link.label : ""));
  return isHttpUrl(target) ? target : "";
}

/** Older profiles stored LinkedIn as a free-form link; recover it so it can fill the dedicated field. */
export function linkedinFromSocials(socials: SocialLink[] | null | undefined): string {
  const hit = (socials ?? []).find(isLinkedinSocial);
  if (!hit) return "";
  const url = normalizeExternalUrl(LINKEDIN_HOST.test(hit.href ?? "") ? hit.href : hit.label);
  return isHttpUrl(url) ? url : "";
}
