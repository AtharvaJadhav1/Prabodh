import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  heading: string;
  description: string;
  action?: ReactNode;
};

export default function EmptyState({ icon, heading, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-brand-sand bg-white px-6 py-16 shadow-xs">
      <div className="mb-4 text-brand-muted/40">{icon}</div>
      <h3 className="text-sm font-bold text-brand-deep">{heading}</h3>
      <p className="mt-1 max-w-xs text-center text-xs text-brand-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
