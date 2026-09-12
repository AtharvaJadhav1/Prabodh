import SectionHeading from "./SectionHeading";

type TrlStage = {
  level: number;
  phase: string;
  title: string;
  desc: string;
};

type TrlPhase = {
  key: string;
  label: string;
  range: string;
  pillClass: string;
  badgeClass: string;
  connectorClass: string;
  items: TrlStage[];
};

const phases: TrlPhase[] = [
  {
    key: "research",
    label: "Research",
    range: "TRL 1–3",
    pillClass: "bg-amber-50 text-amber-900 border-amber-200",
    badgeClass: "bg-amber-100 text-amber-900",
    connectorClass: "border-amber-300",
    items: [
      {
        level: 1,
        phase: "Research",
        title: "Basic Principles Observed",
        desc: "Scientific principles observed; academic literature reviews and foundational property identification.",
      },
      {
        level: 2,
        phase: "Research",
        title: "Concept Formulated",
        desc: "Technology concept defined; architecture outlines, theoretical proofs, and basic design constraints.",
      },
      {
        level: 3,
        phase: "Research",
        title: "Proof of Concept",
        desc: "Core feasibility shown via isolated experiments, mathematical modeling, and baseline algorithm checks.",
      },
    ],
  },
  {
    key: "development",
    label: "Development",
    range: "TRL 4–6",
    pillClass: "bg-orange-50 text-orange-950 border-orange-200",
    badgeClass: "bg-orange-100 text-orange-900",
    connectorClass: "border-orange-300",
    items: [
      {
        level: 4,
        phase: "Development",
        title: "Validated in Lab",
        desc: "Integrated components verified in a controlled lab setup, functioning as a preliminary unit.",
      },
      {
        level: 5,
        phase: "Development",
        title: "Relevant Environment",
        desc: "Prototype tested realistically under synthetic load, staging databases, and near-operational stress.",
      },
      {
        level: 6,
        phase: "Development",
        title: "Demonstrated",
        desc: "Engineering prototype proven in relevant environments — a working end-to-end MVP milestone gate.",
      },
    ],
  },
  {
    key: "deployment",
    label: "Deployment",
    range: "TRL 7–9",
    pillClass: "bg-stone-100 text-[#7C2D12] border-stone-300",
    badgeClass: "bg-stone-200/80 text-[#7C2D12]",
    connectorClass: "border-stone-300",
    items: [
      {
        level: 7,
        phase: "Deployment",
        title: "Operational Environment",
        desc: "Field demonstration with pilot users; real-world edge cases and workflow interoperability confirmed.",
      },
      {
        level: 8,
        phase: "Deployment",
        title: "Complete & Qualified",
        desc: "Production-ready system verified against performance, security, and quality acceptance criteria.",
      },
      {
        level: 9,
        phase: "Deployment",
        title: "Real-World Operations",
        desc: "Sustained deployment in live operations with monitoring, maintenance, and measurable impact tracking.",
      },
    ],
  },
];

const numPad = (n: number) => String(n).padStart(2, "0");

export default function TrlLevels() {
  return (
    <section id="trl-levels" className="border-y border-stone-200/70 bg-[#FAFAF9] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Innovation Maturity"
          title="Technology Readiness Levels"
          subtitle="The industry-standard ladder every Prabodh-guided project climbs, from first concept to deployed system."
        />

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {phases.map((phase) => (
            <div
              key={phase.key}
              className="rounded-2xl border border-stone-200 bg-white/70 p-5 shadow-sm transition-all duration-200 hover:shadow-md"
            >
              {/* Phase header pill */}
              <div className="mb-6 flex items-center justify-between">
                <span
                  className={`inline-block rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider ${phase.pillClass}`}
                >
                  {phase.label} · {phase.range}
                </span>
              </div>

              {/* Stacked level cards with left connecting accent */}
              <div className="relative">
                <div
                  aria-hidden="true"
                  className={`absolute bottom-6 left-[21px] top-6 border-l-2 border-dashed ${phase.connectorClass}`}
                />
                <div className="space-y-4">
                  {phase.items.map((item) => (
                    <div
                      key={item.level}
                      className="group relative flex items-start gap-3.5 rounded-xl border border-stone-200/80 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-md focus:outline-none"
                    >
                      <span
                        className={`relative z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${phase.badgeClass}`}
                      >
                        {numPad(item.level)}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-stone-900">{item.title}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-stone-600">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}