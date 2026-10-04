import { LinkedinIcon } from "./icons";

/**
 * LinkedIn badge shown beside a mentor's name. Icon only for now; pass `url` once mentor
 * LinkedIn profiles are available and it becomes a link that opens in a new tab.
 */
export default function MentorLinkedinIcon({ url, name }: { url?: string | null; name?: string }) {
  const icon = <LinkedinIcon className="h-4 w-4" />;
  const label = name ? `${name} on LinkedIn` : "LinkedIn";
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        title={label}
        className="inline-flex shrink-0 text-[#0A66C2] hover:opacity-80"
      >
        {icon}
      </a>
    );
  }
  return (
    <span className="inline-flex shrink-0 text-[#0A66C2]" title="LinkedIn" role="img" aria-label="LinkedIn">
      {icon}
    </span>
  );
}
