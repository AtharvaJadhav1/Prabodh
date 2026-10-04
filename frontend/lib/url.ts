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
