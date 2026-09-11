"use client";

import { XIcon } from "./icons";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmColor = "primary",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-brand-deep/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onCancel}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`w-full max-w-md rounded-2xl border border-brand-softline bg-white p-6 shadow-2xl transition-all duration-300 ${
            open ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-lg font-bold text-brand-deep">{title}</h3>
            <button
              type="button"
              onClick={onCancel}
              className="shrink-0 rounded-lg p-2 text-brand-muted transition-colors hover:bg-brand-softline hover:text-brand-deep"
              aria-label="Close"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">{message}</p>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-brand-softline bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-cream"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition-colors ${
                confirmColor === "danger"
                  ? "bg-brand-overdue hover:bg-red-700"
                  : "bg-brand-deep hover:bg-brand-primary"
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
