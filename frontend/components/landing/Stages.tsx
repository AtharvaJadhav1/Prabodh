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
    title: "Idea Submission & Team Formation",
    desc: "Multidisciplinary teams form and submit problem statements from curated themes — hackathons, research, or industry challenges.",
  },
  {
    num: "02",
    title: "Dual Mentorship Review",
    desc: "Feasibility, architecture, and technology stack vetting by assigned Institute and Industry mentors.",
    active: true,
  },
  {
    num: "03",
    title: "Prototype & Milestone Evaluation",
    desc: "Stage-gate reviews with measurable milestones and TRL-based rubrics as teams build working prototypes.",
  },
  {
    num: "04",
    title: "Incubation & Showcase",
    desc: "Shortlisted teams advance into pre-incubation support, investor pitches, and institutional demo days.",
  },
];

export default function Stages() {
  return (
    <section id="prabodh-stages" className="border-b border-brand-sand bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Structured Execution"
          title="End-to-End Prabodh Lifecycle"
          subtitle="A proven phase-driven framework guiding any event or incubation — from ideation to showcase."
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