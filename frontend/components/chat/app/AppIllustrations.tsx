type P = { className?: string };

/** Friendly "no chats yet" artwork: two overlapping speech bubbles. Colours come from the chat theme variables. */
export function EmptyChatsArt({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 160 120" fill="none" aria-hidden="true" focusable="false">
      <ellipse cx="80" cy="108" rx="46" ry="6" fill="var(--chat-line)" />
      <path
        d="M30 22a10 10 0 0110-10h50a10 10 0 0110 10v32a10 10 0 01-10 10H62l-14 12V64h-8a10 10 0 01-10-10z"
        fill="var(--chat-brand-soft)"
        stroke="var(--chat-brand)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M70 52a10 10 0 0110-10h40a10 10 0 0110 10v28a10 10 0 01-10 10h-4v14l-14-14H80a10 10 0 01-10-10z"
        fill="var(--chat-brand)"
        stroke="var(--chat-brand)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="90" cy="66" r="3.5" fill="#fff" />
      <circle cx="103" cy="66" r="3.5" fill="#fff" />
      <circle cx="116" cy="66" r="3.5" fill="#fff" />
      <path d="M44 28h36M44 38h24M44 48h30" stroke="var(--chat-brand)" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

/** "Nothing found" artwork: a magnifier over a small card. */
export function NoResultsArt({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 160 120" fill="none" aria-hidden="true" focusable="false">
      <ellipse cx="80" cy="108" rx="46" ry="6" fill="var(--chat-line)" />
      <rect x="24" y="20" width="84" height="62" rx="10" fill="var(--chat-brand-soft)" stroke="var(--chat-brand)" strokeWidth="2.5" />
      <circle cx="46" cy="42" r="8" fill="var(--chat-brand)" opacity="0.55" />
      <path d="M62 38h34M62 50h22M36 66h58" stroke="var(--chat-brand)" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      <circle cx="108" cy="68" r="18" fill="var(--chat-bg)" stroke="var(--chat-brand)" strokeWidth="4" />
      <path d="M121 81l16 16" stroke="var(--chat-brand)" strokeWidth="6" strokeLinecap="round" />
      <path d="M101 68h14" stroke="var(--chat-brand)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** "Find people" artwork: three friendly avatars. */
export function FindPeopleArt({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 160 120" fill="none" aria-hidden="true" focusable="false">
      <ellipse cx="80" cy="108" rx="52" ry="6" fill="var(--chat-line)" />
      <circle cx="80" cy="46" r="20" fill="var(--chat-brand)" />
      <path d="M44 100c0-20 16-32 36-32s36 12 36 32z" fill="var(--chat-brand)" />
      <circle cx="40" cy="58" r="14" fill="var(--chat-brand-soft)" stroke="var(--chat-brand)" strokeWidth="2.5" />
      <path d="M16 100c0-14 10-24 24-24 5 0 9 1.500 12 4" stroke="var(--chat-brand)" strokeWidth="2.5" strokeLinecap="round" fill="var(--chat-brand-soft)" />
      <circle cx="120" cy="58" r="14" fill="var(--chat-brand-soft)" stroke="var(--chat-brand)" strokeWidth="2.5" />
      <path d="M144 100c0-14-10-24-24-24-5 0-9 1.500-12 4" stroke="var(--chat-brand)" strokeWidth="2.5" strokeLinecap="round" fill="var(--chat-brand-soft)" />
      <path d="M124 14v12M118 20h12" stroke="var(--chat-brand)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
