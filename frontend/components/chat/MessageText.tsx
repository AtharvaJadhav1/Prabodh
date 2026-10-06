import { linkify } from "../../lib/chat-format";

/** Message body with http(s) links made clickable. `linkClassName` lets each theme colour the links. */
export default function MessageText({ text, linkClassName }: { text: string; linkClassName: string }) {
  return (
    <>
      {linkify(text).map((seg, i) =>
        seg.type === "link" ? (
          <a key={i} href={seg.href} target="_blank" rel="noopener noreferrer nofollow" className={linkClassName}>
            {seg.text}
          </a>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
