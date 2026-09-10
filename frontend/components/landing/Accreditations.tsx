import type { ComponentType } from "react";
import SectionHeading from "./SectionHeading";
import { BeakerIcon, BoltIcon, BookIcon, BuildingIcon, ShieldIcon, StarIcon, BulbIcon, TrendIcon } from "./icons";

type Accreditation = {
  icon: ComponentType<{ className?: string }>;
  iconClass: string;
  label: string;
  title: string;
  desc: string;
};

const accreditations: Accreditation[] = [
  {
    icon: ShieldIcon,
    iconClass: "text-brand-primary",
    label: "ARIIA 2021",
    title: "Ranked in Band Excellent",
    desc: "Atal Ranking of Institutions on Innovation Achievements by Ministry of Education, Govt. of India.",
  },
  {
    icon: StarIcon,
    iconClass: "text-brand-amber",
    label: "MoE Rating",
    title: "Received 5 Star Rating - IIC",
    desc: "Highest rating awarded by Institution's Innovation Council, Ministry of Education, Govt. of India.",
  },
  {
    icon: BuildingIcon,
    iconClass: "text-brand-primary",
    label: "ASSOCHAM Award",
    title: "Best University Campus Award",
    desc: "Recognized nationally for iconic educational infrastructure and holistic learning ecosystem.",
  },
  {
    icon: BoltIcon,
    iconClass: "text-brand-amber",
    label: "Incubation Hub",
    title: "AIC by NITI Aayog",
    desc: "Atal Incubation Centre funded by NITI Aayog to accelerate early-stage deeptech student ventures.",
  },
  {
    icon: BookIcon,
    iconClass: "text-brand-primary",
    label: "Jagran Josh Ranking",
    title: "Top Private University",
    desc: "Engineering Category benchmarked among the premier private technical universities in Maharashtra.",
  },
  {
    icon: BulbIcon,
    iconClass: "text-brand-amber",
    label: "Academic Model",
    title: "World-Class Curriculum",
    desc: "Distinct emphasis on Project-Based Learning (PBL) aligned with real-world engineering problem statements.",
  },
  {
    icon: BeakerIcon,
    iconClass: "text-brand-primary",
    label: "R&D Facility",
    title: "CRIEYA Research Lab",
    desc: "Centre for Research, Innovation, Entrepreneurship and Youth Activities dedicated to hackathon prototyping.",
  },
  {
    icon: TrendIcon,
    iconClass: "text-brand-amber",
    label: "Govt. Ranking",
    title: "NIRF Innovation Band 51-100",
    desc: "Ranked in the prestigious National Institutional Ranking Framework (NIRF) Innovation Category.",
  },
];

export default function Accreditations() {
  return (
    <section id="accreditations" className="bg-brand-cream py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Legacy of Excellence"
          title="Recognitions & Accreditations"
          subtitle="Demonstrated institutional quality validated by apex government bodies and academic councils."
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {accreditations.map((item) => (
            <div
              key={item.title}
              className="group flex flex-col items-start rounded-2xl border border-brand-sand bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-lightOrange transition-transform group-hover:scale-110">
                <item.icon className={`h-6 w-6 ${item.iconClass}`} />
              </div>
              <span className="mb-1 text-xs font-bold uppercase tracking-wider text-brand-primary">
                {item.label}
              </span>
              <h3 className="mb-2 text-lg font-bold text-brand-deep">{item.title}</h3>
              <p className="text-xs leading-relaxed text-brand-charcoal/70">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}