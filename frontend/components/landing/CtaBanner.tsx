import Link from "next/link";
import { ArrowRightIcon } from "./icons";

export default function CtaBanner() {
  return (
    <section className="bg-brand-cream py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-brand-sand/30 bg-gradient-to-r from-brand-deep to-[#753c15] p-5 text-white shadow-xl sm:gap-8 sm:p-12 lg:flex-row">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-amber">
              Registration Deadline Approaching
            </span>
            <h3 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
              Ready to lead a project through the Prabodh lifecycle?
            </h3>
            <p className="mt-2 text-sm text-white/80">
              Sign in with your institute email and password to form your team and submit problem statement
              preferences for mentor review.
            </p>
          </div>
          <div className="flex w-full items-center justify-center lg:w-auto lg:justify-end">
            <Link
              href="/login/student"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-7 py-3.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-brand-hover sm:w-auto"
            >
              Access Prabodh Portal
              <ArrowRightIcon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}