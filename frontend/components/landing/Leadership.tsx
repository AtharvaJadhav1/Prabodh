import Image from "next/image";
import SectionHeading from "./SectionHeading";

type Leader = {
  src: string;
  alt: string;
  name: string;
  role: string;
  bio: string;
};

const leaders: Leader[] = [
  {
    src: "/images/leaders/mangesh-karad.jpg",
    alt: "Mangesh Karad",
    name: "Mangesh Karad",
    role: "Executive President & Pro-Chancellor, MIT Art, Design & Technology University, Pune",
    bio: "Executive President & Pro-Chancellor championing holistic, inclusive, international-standard multidisciplinary education. Introduced specialized engineering niches like Naval Engineering and Food Technology to shape students into industry leaders.",
  },
  {
    src: "/images/leaders/mohit-dubey.jpg",
    alt: "Mohit Dubey",
    name: "Mohit Dubey",
    role: "Pro VC & CEO, CRIYA Research Park Foundation, MIT-ADT University, Pune",
    bio: "Pro VC with 19+ years of global experience. As CEO of AIC, he drives startup incubation and venture acceleration, and previously led full automation of university operations, IT infrastructure, and marketing, admissions & examination processes.",
  },
  {
    src: "/images/leaders/santosh-darade.jpg",
    alt: "Santosh Darade",
    name: "Santosh Darade",
    role: "Chief Operating Officer, CRIYA Research Park Foundation, MIT-ADT University",
    bio: "With 20+ years in higher education, R&D, and cybersecurity. Architect of CRIYA, an INR 3 Cr–funded pre-incubation model, enabling 200+ research projects, 30+ prototypes, and 5 startup incubations.",
  },
];

export default function Leadership() {
  return (
    <section id="leadership" className="border-t border-brand-sand bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Guidance" title="Our Mentors & Guides" subtitle="Experienced academic and industry leaders steering incubation, innovation, and mentorship for Prabodh." />
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {leaders.map((leader) => (
            <div
              key={leader.name}
              className="group flex flex-col rounded-3xl border border-brand-sand bg-brand-cream p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary/40 hover:shadow-xl sm:p-8"
            >
              <div className="relative mb-6 aspect-square w-full overflow-hidden rounded-2xl border border-brand-sand bg-brand-deep/10 shadow-sm transition-transform duration-300 group-hover:scale-[1.02]">
                <Image
                  src={leader.src}
                  alt={leader.alt}
                  fill
                  sizes="(max-width: 768px) 90vw, 33vw"
                  className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <h3 className="text-xl font-bold text-brand-deep transition-colors duration-300 group-hover:text-brand-primary">
                {leader.name}
              </h3>
              <p className="mt-1 text-sm font-semibold text-brand-amber">{leader.role}</p>
              <p className="mt-3 text-justify text-sm leading-relaxed text-brand-charcoal/75">{leader.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
