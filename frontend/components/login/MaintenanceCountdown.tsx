"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthFooter from "./AuthFooter";
import RightPanel from "./RightPanel";

const INITIAL_SECONDS = 18 * 60 * 60 - 1;

export default function MaintenanceCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(INITIAL_SECONDS);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const hours = Math.floor(secondsLeft / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((secondsLeft % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const secs = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <main className="flex min-h-screen w-full flex-col bg-brand-cream lg:h-screen lg:flex-row lg:overflow-hidden">
      <section className="scrollbar-none z-10 flex min-h-screen w-full flex-col justify-between border-r border-brand-sand/70 bg-brand-cream p-8 max-sm:px-5 max-sm:py-6 sm:p-12 lg:h-screen lg:w-[46%] lg:overflow-y-auto lg:overscroll-contain xl:w-[42%]">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-brand-sand/80 pb-6">
            <div className="flex min-w-0 items-center">
              <Link href="/" className="flex shrink-0 items-center">
                <Image
                  src="/images/logo/Prabodh_Horizontal_Logo_Web_1000px.png"
                  alt="Prabodh"
                  width={1000}
                  height={233}
                  priority
                  className="h-10 w-auto sm:h-12"
                />
              </Link>
            </div>
            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-sand px-3 py-1.5 text-xs font-semibold text-brand-deep shadow-sm transition-all duration-200 hover:border-brand-amber hover:bg-white"
            >
              Home
            </Link>
          </div>

          <div className="py-6 pb-10 pt-4 sm:py-8 text-center">
            <h1 className="font-serif text-3xl font-extrabold leading-[1.1] tracking-tight text-brand-charcoal sm:text-4xl">
              PROCESSING TOP 100 TEAMS
            </h1>
            <p className="mt-6 text-brand-deep max-w-md mx-auto">
              New account registrations and password resets are temporarily paused
              as we evaluate and process submissions for the top 100 teams. Existing
              users can continue to log in and access their accounts normally.
            </p>

            <div className="mt-10">
              <div
                className="font-mono text-4xl font-bold text-brand-charcoal tracking-wider sm:text-5xl lg:text-6xl"
                aria-live="polite"
                aria-label={`Time remaining: ${hours} hours, ${minutes} minutes, ${secs} seconds`}
              >
                {hours}:{minutes}:{secs}
              </div>
              <p className="mt-2 text-sm text-brand-muted">
                Registration & password reset resumes automatically
              </p>
            </div>

            <Link
              href="/login"
              className="mt-10 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-deep px-6 py-3 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-deep focus:ring-offset-2 focus:ring-offset-brand-cream"
            >
              Back to Sign In
            </Link>
          </div>
        </div>

        <div className="mt-auto pt-6">
          <AuthFooter />
        </div>
      </section>

      <div className="hidden lg:block lg:h-screen lg:w-[54%] xl:w-[58%]">
        <RightPanel />
      </div>
    </main>
  );
}