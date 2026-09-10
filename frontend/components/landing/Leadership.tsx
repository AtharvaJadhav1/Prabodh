import Image from "next/image";
import SectionHeading from "./SectionHeading";

type Leader = {
  src: string;
  alt: string;
  name: string;
  role: string;
  tag: string;
  quote: string;
  bio: string;
};

const leaders: Leader[] = [
  {
    src: "/images/leaders/vishwanath-karad.jpg",
    alt: "Prof. Dr. Vishwanath D. Karad - Founder & President",
    name: "Prof. Dr. Vishwanath D. Karad",
    role: "Founder & President, MIT Group",
    tag: "Eminent Educationist",
    quote: "The union of science and spirituality alone can bring harmony and peace to mankind through dedicated youth innovation.",
    bio: "UNESCO Chairholder for Human Rights, Democracy, and Peace, establishing an enduring legacy of nation-building.",
  },
  {
    src: "/images/leaders/mangesh-karad.jpg",
    alt: "Dr. Mangesh T. Karad - Executive President",
    name: "Dr. Mangesh T. Karad",
    role: "Executive President & Vice-Chancellor",
    tag: "Academic Architect",
    quote: "We groom students not just to seek jobs, but to architect indigenous technological solutions for India's deepest challenges.",
    bio: "Visionary behind the MIT-ADT Art, Design & Technology confluence and Project-Based Learning curriculum.",
  },
  {
    src: "/images/leaders/rajesh.jpg",
    alt: "Prof. Dr. Rajesh S. - Vice Chancellor",
    name: "Prof. Dr. Rajesh S.",
    role: "Vice Chancellor & Nodal Mentor",
    tag: "Innovation Strategist",
    quote: "Smart India Hackathon represents the ultimate crucible for engineering discipline, resilience, and rapid productization.",
    bio: "Head of R&D Steering Council and Executive Champion for Ministry of Education national hackathon cells.",
  },
];

export default function Leadership() {
  return (
    <section id="leadership" className="border-t border-brand-sand bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Visionaries & Mentors"
          title="Leadership & Institutional Vision"
          subtitle="Guided by pioneers in value-based education and transformative technological research."
        />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {leaders.map((leader) => (
            <div
              key={leader.name}
              className="flex flex-col justify-between rounded-3xl border border-brand-sand bg-brand-cream p-6 transition-all duration-300 hover:shadow-lg sm:p-8"
            >
              <div>
                <div className="relative mb-6 aspect-square overflow-hidden rounded-2xl border border-brand-sand bg-brand-deep/10 shadow-sm">
                  <Image
                    src={leader.src}
                    alt={leader.alt}
                    fill
                    sizes="(max-width: 768px) 90vw, 33vw"
                    className="object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-amber">
                      {leader.tag}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-brand-deep">{leader.name}</h3>
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-brand-primary">{leader.role}</p>
                <blockquote className="mb-4 border-l-2 border-brand-primary py-1 pl-3 text-sm font-medium italic leading-relaxed text-brand-deep">
                  &quot;{leader.quote}&quot;
                </blockquote>
              </div>
              <p className="border-t border-brand-sand pt-2 text-xs leading-relaxed text-brand-charcoal/70">
                {leader.bio}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}