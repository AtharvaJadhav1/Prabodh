import Image from "next/image";
import { CheckIcon } from "./icons";

const features = [
  {
    title: "Project-Based Learning",
    desc: "Curriculum-integrated innovation solving live real-world challenges.",
    accent: "text-[#059669]",
    bg: "bg-[#059669]/10",
  },
  {
    title: "Faculty Mentorship Track",
    desc: "Direct guidance from institutional professors throughout the cycle.",
    accent: "text-[#059669]",
    bg: "bg-[#059669]/10",
  },
  {
    title: "Incubation Pipeline",
    desc: "Fast-tracking top team prototypes toward patents and seed funding.",
    accent: "text-[#C25E26]",
    bg: "bg-[#C25E26]/10",
  },
  {
    title: "Campus-Wide Evaluation",
    desc: "Standardized rubrics and milestone reviews across all engineering cohorts.",
    accent: "text-[#C25E26]",
    bg: "bg-[#C25E26]/10",
  },
];

export default function Campus() {
  return (
    <section id="campus" className="bg-brand-cream py-12 sm:py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-brand-sand bg-white p-4 shadow-xl sm:p-6 md:p-8 lg:p-14">
          <div className="grid grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="relative lg:col-span-6">
              <div className="group relative overflow-hidden rounded-2xl border border-brand-sand shadow-lg">
                <Image
                  src="/images/campus/campus_image.png"
                  alt="MIT-ADT University Campus, Pune — Prabodh pilot partner"
                  width={1241}
                  height={866}
                  priority
                  className="h-80 w-full object-cover sm:h-96"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="rounded bg-brand-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                    Rajbaug Campus, Pune
                  </span>
                  <p className="mt-1 text-sm font-bold text-brand-cream">
                    125+ Acres of World-Class Innovation Ecosystem on the Banks of Mula-Mutha
                  </p>
                </div>
              </div>
              <div className="absolute -right-4 -top-4 hidden items-center gap-3 rounded-xl border border-brand-amber/30 bg-brand-deep p-4 text-white shadow-lg sm:flex">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-lg font-bold">
                  125
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-white/70">Sprawling</div>
                  <div className="text-sm font-bold text-white">Acre Green Campus</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center lg:col-span-6">
              <div className="mb-4 inline-flex w-max items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-lightOrange px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-primary">
                Our Partner
              </div>
              <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-brand-deep sm:text-3xl lg:text-4xl">
                Our Partner: MIT-ADT University
              </h2>
              <p className="mb-8 text-base leading-relaxed text-brand-charcoal/80">
                Prabodh is running a one-semester Project-Based Learning pilot with MIT Art, Design and
                Technology University, Pune — staffing weekly, hands-on mentorship across 60 problem
                statements, 180 project teams, and 900 students on the university&apos;s Rajbaug campus.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {features.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${feature.bg} ${feature.accent}`}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-brand-deep">{feature.title}</h4>
                      <p className="text-xs text-brand-charcoal/70">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}