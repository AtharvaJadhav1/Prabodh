"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChatMessage } from "../../lib/chat-types";
import { CopyIcon, TrashIcon } from "./chat-icons";

export type MenuState = { msg: ChatMessage; x: number; y: number } | null;

/** Floating context menu for a message (desktop and tablet layouts). */
export default function MessageMenu({
  menu,
  onClose,
  onCopy,
  onDelete,
}: {
  menu: NonNullable<MenuState>;
  onClose: () => void;
  onCopy: (m: ChatMessage) => void;
  onDelete: (m: ChatMessage) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: menu.x, top: menu.y });
  const canDelete = menu.msg.mine && !!menu.msg.id && !menu.msg.deleted;
  const canCopy = !menu.msg.deleted && menu.msg.body.length > 0;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    setPos({
      left: Math.max(8, Math.min(menu.x - w + 8, window.innerWidth - w - 8)),
      top: Math.max(8, Math.min(menu.y, window.innerHeight - h - 8)),
    });
    el.querySelector<HTMLElement>("button")?.focus();
  }, [menu]);

  useEffect(() => {
    const onDown = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  if (!canCopy && !canDelete) return null;

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Message actions"
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-[80] w-44 overflow-hidden rounded-xl border border-brand-softline bg-white py-1 shadow-xl"
    >
      {canCopy ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => onCopy(menu.msg)}
          className="flex min-h-[44px] w-full items-center gap-2.5 px-3 text-left text-sm font-semibold text-brand-charcoal hover:bg-brand-lightOrange focus-visible:bg-brand-lightOrange focus-visible:outline-none"
        >
          <CopyIcon className="h-4 w-4 text-brand-muted" /> Copy
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => onDelete(menu.msg)}
          className="flex min-h-[44px] w-full items-center gap-2.5 px-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none"
        >
          <TrashIcon className="h-4 w-4" /> Delete
        </button>
      ) : null}
    </div>
  );
}
