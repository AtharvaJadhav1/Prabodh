import type { ReactNode } from "react";

type P = { className?: string };

function Svg({ className, children, fill = false }: P & { children: ReactNode; fill?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const BackIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M15 18l-6-6 6-6" />
  </Svg>
);
export const SendIcon = ({ className }: P) => (
  <Svg className={className} fill>
    <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
  </Svg>
);
export const SearchIcon = ({ className }: P) => (
  <Svg className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Svg>
);
export const ExpandIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </Svg>
);
export const CloseIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M18 6L6 18M6 6l12 12" />
  </Svg>
);
export const GroupIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </Svg>
);
export const ChatIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.6 8.6 0 01-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 1121 11.5z" />
  </Svg>
);
export const UserPlusIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6M22 11h-6" />
  </Svg>
);
export const CheckIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M20 6L9 17l-5-5" />
  </Svg>
);
export const ChevronDownIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);
export const ClockIcon = ({ className }: P) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const AlertIcon = ({ className }: P) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16.5v.01" />
  </Svg>
);
export const LinkedinIcon = ({ className }: P) => (
  <Svg className={className} fill>
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
  </Svg>
);
export const CopyIcon = ({ className }: P) => (
  <Svg className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </Svg>
);
export const TrashIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" />
  </Svg>
);
export const RetryIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M21 12a9 9 0 11-3-6.7M21 4v5h-5" />
  </Svg>
);
export const ArrowDownIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </Svg>
);

/** Single tick (sent). */
export const TickIcon = ({ className }: P) => (
  <svg className={className} viewBox="0 0 16 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1.5 5.8l3.4 3.4L11.5 1.8" />
  </svg>
);
/** Double tick (read). */
export const DoubleTickIcon = ({ className }: P) => (
  <svg className={className} viewBox="0 0 20 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1.5 5.8l3.4 3.4L11.5 1.8M8.2 8.6l.6.6 6.7-7.4" />
  </svg>
);

export const PlusIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
/** Speech bubble with a plus: start a new chat. */
export const NewChatIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.6 8.6 0 01-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 1121 11.5z" />
    <path d="M12 8.5v6M9 11.5h6" />
  </Svg>
);
export const HomeIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />
  </Svg>
);
export const FileTextIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </Svg>
);
export const MentorIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M22 9L12 4 2 9l10 5z" />
    <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.500 6-3v-4.500M22 9v5" />
  </Svg>
);
export const UserIcon = ({ className }: P) => (
  <Svg className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1" />
  </Svg>
);
export const LogoutIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
  </Svg>
);
export const KebabIcon = ({ className }: P) => (
  <Svg className={className} fill>
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </Svg>
);
export const ExternalIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
  </Svg>
);
