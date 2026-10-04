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
