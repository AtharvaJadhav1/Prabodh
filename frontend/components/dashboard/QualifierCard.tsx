import { SparklesIcon, InfoIcon } from "./icons";

const rules = [
  "Team size must be exactly 6 members to lock submission.",
  "All members must be enrolled in 3rd Year UG across recognized branches.",
  "Only the Team Lead may finalize invites, roster, and lock.",
  "Every member must earn Full Stack & AI Foundation micro-badges.",
  "Two mentors (Institute + Industry) are mandatory for Stage 2.",
  "Late submissions after September 15, 23:59 IST are auto-disqualified.",
];

export default function QualifierCard() {
  return (
    <section className="rounded-2xl bg-brand-deep p-5 text-white sm:p-6">
      <div className="flex items-center gap-2">
        <SparklesIcon className="h-5 w-5 text-brand-amber" />
        <h2 className="text-base font-bold">SIH Qualifier Rules</h2>
      </div>
      <ul className="mt-4 space-y-3">
        {rules.map((rule, i) => (
          <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-white/85">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-amber/20 text-[10px] font-bold text-brand-amber">
              {i + 1}
            </span>
            {rule}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-white/10 p-3.5 text-xs leading-relaxed text-white/85">
        <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-amber" />
        <p>
          Rules snapshot refreshed <span className="font-bold">Today, 09:00 IST</span>. SPOC revisions
          sync automatically to the SIH National Portal.
        </p>
      </div>
    </section>
  );
}