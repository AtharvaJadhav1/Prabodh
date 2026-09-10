import Image from "next/image";

type Award = {
  image: string;
  imageAlt: string;
  title: string;
  sub: string;
};

const awards: Award[] = [
  {
    image: "/images/awards/rankedtop.png",
    imageAlt: "#1 Top Private University award badge",
    title: "Top Private University",
    sub: "Jagran Josh Engineering Honor",
  },
  {
    image: "/images/awards/bestcampus.png",
    imageAlt: "Best Campus Award badge",
    title: "Best Campus Award",
    sub: "ASSOCHAM National Award",
  },
  {
    image: "/images/awards/5startrating.png",
    imageAlt: "5 Star Rating award badge",
    title: "5 Star Rating",
    sub: "Institution Innovation Council (MoE)",
  },
  {
    image: "/images/awards/26ranked.png",
    imageAlt: "Ranked 26th ARIIA award badge",
    title: "Ranked 26th in ARIIA",
    sub: "Atal Innovation Rankings 2020",
  },
];

export default function Awards() {
  return (
    <section id="awards" className="border-y border-brand-sand bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-center justify-center">
          <h2 className="font-serif text-2xl font-extrabold uppercase tracking-widest text-brand-deep">
            Awards
          </h2>
          <div className="mt-3 h-1 w-20 rounded-full bg-brand-primary"></div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {awards.map((award) => (
            <div
              key={award.title}
              className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-brand-sand bg-brand-cream p-6 text-center transition-colors hover:border-brand-amber"
            >
              <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-brand-sand bg-white shadow-sm">
                <Image
                  src={award.image}
                  alt={award.imageAlt}
                  width={200}
                  height={200}
                  className="h-full w-full object-contain"
                />
              </div>
              <h4 className="text-sm font-bold uppercase tracking-wide text-brand-deep">{award.title}</h4>
              <p className="mt-1 text-xs font-medium text-brand-charcoal/70">{award.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}