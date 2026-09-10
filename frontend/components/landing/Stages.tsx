import SectionHeading from "./SectionHeading";

type Stage = {
  num: string;
  label?: string;
  labelClass?: string;
  title: string;
  desc: string;
  active?: boolean;
};

const stages: Stage[] = [
  {
    num: "01",
    title: "Team Formation & Ideation",
    desc: "6-member multidisciplinary teams with mandatory female representation. Problem selection from MoE SIH themes.",
  },
  {
    num: "02",
    title: "Dual Mentorship Review",
    desc: "Feasibility, architecture, and technology stack vetting by assigned Institute and Industry mentors.",
    active: true,
  },
  {
    num: "03",
    label: "Upcoming Gate",
    labelClass: "bg-brand-cream border border-brand-sand text-brand-charcoal/60",
    title: "Internal Institute Hackathon",
    desc: "Campus-wide live pitching and evaluation. Top qualifying teams shortlisted for national portal upload.",
  },
  {
    num: "04",
    label: "Final Milestone",
    labelClass: "bg-brand-cream border border-brand-sand text-brand-charcoal/60",
    title: "National Grand Finale",
    desc: "36-hour non-stop digital hackathon at designated nodal centers across India for cash prizes & grants.",
  },
];

export default function Stages() {
  return (
    <section id="hackathon-stages" className="border-b border-brand-sand bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Structured Execution"
          title="End-to-End SIH Lifecycle"
          subtitle="Four rigorous phases ensuring the best engineering talent reaches the National Grand Finale."
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {stages.map((stage) => (
            <div
              key={stage.num}
              className={
                stage.active
                  ? "relative rounded-2xl border-2 border-brand-primary/50 bg-white p-6 shadow-sm"
                  : "group relative rounded-2xl border border-brand-sand bg-brand-cream p-6 transition-all hover:border-brand-primary/40"
              }
            >
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                  stage.active ? "bg-brand-primary text-white shadow-sm" : "bg-brand-deep text-brand-cream"
                }`}
              >
                {stage.num}
              </div>
              {stage.label && (
                <div className={`mb-2 inline-block rounded px-2.5 py-0.5 text-[11px] font-bold ${stage.labelClass}`}>
                  {stage.label}
                </div>
              )}
              <h3 className="mb-2 text-base font-bold text-brand-deep">{stage.title}</h3>
              <p className="text-xs leading-relaxed text-brand-charcoal/70">{stage.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}