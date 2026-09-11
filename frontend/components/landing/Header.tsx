"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PortalIcon, MenuIcon, XIcon, ArrowRightIcon } from "./icons";

const navLinks = [
  { label: "Hackathon Stages", href: "#hackathon-stages" },
  { label: "Accreditations", href: "#accreditations" },
  { label: "Awards & Recognition", href: "#awards" },
  { label: "Campus", href: "#campus" },
  { label: "Leadership", href: "#leadership" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-sand bg-white/95 backdrop-blur-md transition-all duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <a href="#home" className="group flex items-center focus:outline-none">
            <Image
              src="/images/logo/Prabodh_Horizontal_Logo_Web_1000px.png"
              alt="Prabodh"
              width={1000}
              height={233}
              priority
              className="h-10 w-auto transition-opacity duration-300 group-hover:opacity-90 sm:h-12"
            />
          </a>

          <nav className="hidden items-center space-x-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative py-1 text-sm font-semibold text-brand-charcoal transition-colors after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-brand-primary after:transition-all hover:text-brand-primary hover:after:w-full"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login/student"
              className="inline-flex transform items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-hover hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            >
              <PortalIcon className="h-4 w-4" />
              <span>Access Portal</span>
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg border border-brand-sand p-2 text-brand-deep transition-colors hover:bg-brand-surface md:hidden"
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`overflow-hidden border-t border-brand-sand bg-white transition-[max-height,opacity] duration-300 ease-out md:hidden ${
          menuOpen ? "max-h-[480px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-brand-charcoal transition-colors hover:bg-brand-surface hover:text-brand-primary"
            >
              {link.label}
              <ArrowRightIcon className="h-4 w-4 text-brand-muted" />
            </a>
          ))}
          <div className="flex items-center gap-2 border-t border-brand-sand pt-4">
            <Link
              href="/login/student"
              onClick={() => setMenuOpen(false)}
              className="flex-1 rounded-xl border border-brand-sand px-4 py-3 text-center text-sm font-bold text-brand-deep transition-colors hover:border-brand-primary/40 hover:text-brand-primary sm:hidden"
            >
              Student Login
            </Link>
            <Link
              href="/login/faculty"
              onClick={() => setMenuOpen(false)}
              className="flex-1 rounded-xl bg-brand-deep px-4 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-brand-charcoal"
            >
              Faculty Login
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}