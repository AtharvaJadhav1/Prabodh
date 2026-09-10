"use client";

import type { ReactNode } from "react";
import { XIcon } from "../dashboard/icons";

type DrawerShellProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export default function DrawerShell({
  open,
  title,
  subtitle,
  icon,
  onClose,
  children,
  footer,
}: DrawerShellProps) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-brand-deep/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-brand-sand px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon}
            <div className="min-w-0">
              <h2 className="text-base font-bold text-brand-deep">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs font-medium text-brand-muted">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-brand-muted transition-colors hover:bg-brand-sand hover:text-brand-deep"
            aria-label={`Close ${title}`}
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && <div className="border-t border-brand-sand px-5 py-4">{footer}</div>}
      </aside>
    </div>
  );
}