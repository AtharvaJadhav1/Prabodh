import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  label: string;
  className?: string;
};

export default function PlaceholderLink({ icon, label, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-brand-muted/60 cursor-not-allowed select-none ${className}`}
    >
      {icon}
      {label}
      <span className="ml-1 rounded bg-brand-sand px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-muted/70">
        Coming soon
      </span>
    </span>
  );
}
