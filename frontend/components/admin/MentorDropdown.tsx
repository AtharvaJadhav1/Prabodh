"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon } from "../dashboard/icons";

export type MentorOption = {
  id: string;
  name: string;
  subtext?: string;
};

type MentorDropdownProps = {
  options: MentorOption[];
  selectedId?: string;
  placeholder?: string;
  onSelect: (id: string) => void;
  allowClear?: boolean;
  disabled?: boolean;
};

const MENU_MAX_HEIGHT = 240;
const GAP = 4;

type MenuPos = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

export default function MentorDropdown({
  options,
  selectedId,
  placeholder = "Select mentor...",
  onSelect,
  allowClear = false,
  disabled = false,
}: MentorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === selectedId);

  // The menu is drawn in a portal at the page level. Inside the allocation table the wrapper
  // is `overflow-x-auto` (which also clips vertically), so an in-flow absolute menu got cut off
  // and the lower options could not be reached.
  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - GAP - 8;
    const above = r.top - GAP - 8;
    const openUp = below < 160 && above > below;
    const room = openUp ? above : below;
    const maxHeight = Math.max(120, Math.min(MENU_MAX_HEIGHT, room));
    setPos(
      openUp
        ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + GAP, maxHeight }
        : { left: r.left, width: r.width, top: r.bottom + GAP, maxHeight },
    );
  }, []);

  useLayoutEffect(() => {
    if (isOpen) place();
  }, [isOpen, place]);

  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    // Follow the trigger while the page or any scroll container moves; close on resize.
    const reposition = () => place();
    const close = () => setIsOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", close);
    };
  }, [isOpen, place]);

  const choose = (id: string) => {
    onSelect(id);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full min-w-[220px]">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-left text-sm shadow-sm transition-all hover:border-neutral-300 hover:bg-neutral-50/60 focus:outline-none focus:ring-2 focus:ring-[#d95c26]/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={`truncate font-medium ${selectedOption ? "text-neutral-900" : "text-neutral-400"}`}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Floating Menu (portal, fixed to the viewport) */}
      {isOpen && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              style={{
                position: "fixed",
                left: pos.left,
                width: pos.width,
                top: pos.top,
                bottom: pos.bottom,
                maxHeight: pos.maxHeight,
              }}
              className="z-[100] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-xl"
            >
              {allowClear && selectedId ? (
                <>
                  <button
                    key="none"
                    type="button"
                    onClick={() => choose("")}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="truncate">None — unassign</span>
                    </div>
                  </button>
                  <div className="my-1 h-px bg-neutral-100" />
                </>
              ) : null}
              {options.length === 0 ? (
                <div className="px-3 py-2 text-center text-xs text-neutral-400">No mentors available</div>
              ) : (
                options.map((option) => {
                  const isSelected = option.id === selectedId;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => choose(option.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-[#d95c26]/10 font-semibold text-[#d95c26]"
                          : "text-neutral-700 hover:bg-neutral-100"
                      }`}
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span className="truncate">{option.name}</span>
                        {option.subtext && (
                          <span className="truncate text-xs font-normal text-neutral-400">{option.subtext}</span>
                        )}
                      </div>
                      {isSelected && <CheckIcon className="h-4 w-4 shrink-0 text-[#d95c26]" />}
                    </button>
                  );
                })
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
