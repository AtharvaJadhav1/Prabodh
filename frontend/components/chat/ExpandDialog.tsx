"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./chat-icons";
import { useViewportFit } from "./useViewportFit";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Near-fullscreen modal: portal, focus trap, Esc to close, body scroll lock. */
export default function ExpandDialog({ title, onClose, children }: Props) {
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const fitHeight = useViewportFit(rootRef, true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      if (prevFocus && document.contains(prevFocus)) prevFocus.focus();
    };
  }, [mounted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Inner popovers stop propagation of Escape in the capture phase, so only a bare Esc lands here.
        onClose();
        return;
      }
      if (e.key !== "Tab" || !rootRef.current) return;
      const nodes = Array.from(rootRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null || n === document.activeElement,
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (!rootRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 top-0 z-[100] flex items-stretch justify-center bg-brand-deep/50 backdrop-blur-sm sm:p-4"
      style={{ height: fitHeight ?? "100dvh" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-full w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-brand-softline bg-[#FAF7F2] pl-4 pr-1.5">
          <h2 className="text-sm font-bold text-brand-deep">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close expanded chat"
            className="flex h-11 w-11 items-center justify-center rounded-full text-brand-muted hover:bg-white hover:text-brand-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
