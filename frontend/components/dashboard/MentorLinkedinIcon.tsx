import { isHttpUrl, normalizeExternalUrl } from "../../lib/url";
import { LinkedinIcon } from "./icons";

/**
 * LinkedIn badge shown beside a mentor's name. Renders nothing unless the mentor has
 * actually saved a link on their profile — with a URL it becomes a link that opens in a
 * new tab, so students can only click it when there is a real profile to land on.
 */
export default function MentorLinkedinIcon({ url, name }: { url?: string | null; name?: string }) {
  const href = normalizeExternalUrl(url);
  if (!href || !isHttpUrl(href)) return null;

  const label = name ? `${name} on LinkedIn` : "LinkedIn";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="inline-flex shrink-0 text-[#0A66C2] hover:opacity-80 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2]/50"
    >
      <LinkedinIcon className="h-4 w-4" />
    </a>
  );
}
