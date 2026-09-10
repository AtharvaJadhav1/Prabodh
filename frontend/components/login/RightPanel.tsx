import Image from "next/image";

export default function RightPanel() {
  return (
    <section className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-brand-deep p-12 text-white lg:min-h-screen">
      <Image
        src="/images/campus/campus_image.png"
        alt=""
        width={1241}
        height={866}
        priority
        className="absolute inset-0 h-full w-full scale-105 object-cover mix-blend-luminosity opacity-40 transition-transform duration-1000 hover:scale-100"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-deep via-brand-deep/80 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-brand-deep/90 via-transparent to-brand-amber/20"></div>

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-black/40 px-4 py-2 backdrop-blur-md">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-primary opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-primary"></span>
          </span>
          <span className="text-xs font-semibold tracking-wide text-amber-100">SIH 2026 Internal Qualifier Active</span>
        </div>
        <div className="rounded-full border border-white/10 bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-amber backdrop-blur-md">
          Stage 1: Internal Gating
        </div>
      </div>

      <div className="relative z-10 my-auto max-w-xl space-y-6">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-amber/90">
            Ministry of Education Innovation Cell &amp; AICTE Initiative
          </span>
          <h2 className="font-serif text-4xl font-extrabold leading-[1.15] tracking-tight text-white xl:text-5xl">
            Transforming Young Minds into Nation Builders.
          </h2>
          <p className="text-sm font-normal leading-relaxed text-stone-300 xl:text-base">
            Welcome to the centralized internal hackathon evaluation framework for MIT Art, Design and Technology
            University. Build multidisciplinary prototypes for Smart Governance, AgriTech, FinTech, and MedTech.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-lg backdrop-blur-md">
            <p className="font-serif text-2xl font-bold text-brand-amber xl:text-3xl">120+</p>
            <p className="mt-1 text-xs font-medium text-stone-300">Teams Ideating</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-lg backdrop-blur-md">
            <p className="font-serif text-2xl font-bold text-white xl:text-3xl">48</p>
            <p className="mt-1 text-xs font-medium text-stone-300">Statements Locked</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-lg backdrop-blur-md">
            <p className="font-serif text-2xl font-bold text-brand-amber xl:text-3xl">24</p>
            <p className="mt-1 text-xs font-medium text-stone-300">Mentors Onboarded</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-stone-400">
        <span>Approved Nodal Center for SIH Hardware &amp; Software Editions</span>
        <span className="font-medium text-amber-100/70">Rajbaug Campus, Loni Kalbhor</span>
      </div>
    </section>
  );
}