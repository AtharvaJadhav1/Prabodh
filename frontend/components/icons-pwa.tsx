type IconProps = { className?: string };

export function XIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function SparklesIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2zM5 16l.9 2.1L8 19l-2.1.9L5 22l-.9-2.1L2 19l2.1-.9L5 16zM19 14l.7 1.6L21 16l-1.3.4L19 18l-.7-1.6L17 16l1.3-.4L19 14z" />
    </svg>
  );
}

export function WifiOffIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2 9l3.5 3.5M22 9l-3.5 3.5M5.5 12.5a12 12 0 013-1.6M18.5 12.5a12 12 0 00-3-1.6M8.5 16a6 6 0 013.5-1.55M15.5 16a6 6 0 00-3.5-1.55M12 19h.01M2 2l20 20"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function PowerIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}