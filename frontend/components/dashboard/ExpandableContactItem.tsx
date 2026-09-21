"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { CheckIcon } from "./icons";

type ExpandableContactItemProps = {
  icon: ReactNode;
  label: string;
  value: string;
  isLink?: boolean;
  href?: string;
  onCopy?: boolean;
  onAction?: () => void;
};

export default function ExpandableContactItem({
  icon,
  label,
  value,
  isLink,
  href,
  onCopy,
  onAction,
}: ExpandableContactItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const lockedRef = useRef(false);

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const handleOpen = () => {
    if (lockedRef.current) return;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (lockedRef.current) return;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setCopied(false);
    }, 250);
  };

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    lockedRef.current = true;
    setIsOpen(true);

    if (onCopy) {
      void navigator.clipboard?.writeText(value);
      setCopied(true);
    } else if (isLink && href) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else if (onAction) {
      onAction();
    }

    timeoutRef.current = window.setTimeout(() => {
      lockedRef.current = false;
      setIsOpen(false);
      setCopied(false);
    }, 3000);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as unknown as MouseEvent);
        }
      }}
      title={copied ? "Copied to clipboard" : label}
      className={`inline-flex h-9 cursor-pointer select-none items-center overflow-hidden rounded-xl border border-brand-softline/80 bg-white/80 text-brand-deep shadow-sm transition-all duration-300 ease-out hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
        isOpen ? "max-w-[360px] justify-start gap-2 bg-white pl-2.5 pr-3.5 shadow" : "max-w-[38px] justify-center gap-0 px-2.5"
      }`}
    >
      <div className="shrink-0 text-brand-deep">
        {copied ? <CheckIcon className="h-4 w-4 text-emerald-600" /> : icon}
      </div>
      <span
        className={`whitespace-nowrap text-xs font-semibold text-brand-deep transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none w-0 overflow-hidden opacity-0"
        }`}
      >
        {copied ? "Copied to clipboard!" : value}
      </span>
    </div>
  );
}
