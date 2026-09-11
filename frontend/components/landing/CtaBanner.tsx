import Link from "next/link";
import { ArrowRightIcon } from "./icons";

export default function CtaBanner() {
  return (
    <section className="bg-brand-cream py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 rounded-3xl border border-brand-sand/30 bg-gradient-to-r from-brand-deep to-[#753c15] p-8 text-white shadow-xl sm:p-12 lg:flex-row">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-amber">
              Registration Deadline Approaching
            </span>
            <h3 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
              Ready to represent MIT-ADT at SIH 2026?
            </h3>
            <p className="mt-2 text-sm text-white/80">
              Sign in through your verified college Clerk credentials to form your team or submit problem
              statements.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/login/student"
              className="group inline-flex items-center gap-2 rounded-xl bg-brand-primary px-7 py-3.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-brand-hover"
            >
              Access SIH Portal
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <a
              href="#hackathon-stages"
              className="rounded-xl border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/20"
            >
              Download Guidelines
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}