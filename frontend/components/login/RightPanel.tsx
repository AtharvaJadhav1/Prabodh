import WebThreads from "./WebThreads";

export default function RightPanel() {
  return (
    <section className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-brand-deep p-12 text-white lg:min-h-screen">
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <WebThreads
          color1="#E59850"
          color2="#D96B27"
          color3="#FFFFFF"
          speed={0.22}
          threadCount={7}
          frequency={4.5}
          spread={0.2}
          taper={1.0}
          position={0.5}
          fanMode="center"
          glow={0.035}
          falloff={0.55}
          thickness={1.2}
          brightness={0.75}
          opacity={0.9}
          mirror={true}
          shimmer={true}
          grain={true}
          grainIntensity={0.04}
          mouseInteraction={true}
          mouseStrength={0.4}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-deep via-brand-deep/80 to-transparent"></div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-deep/90 via-transparent to-brand-amber/20"></div>

      <div className="pointer-events-none relative z-10 my-auto w-full max-w-xl">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-amber-200/90">
          Centre of Research and Innovation for Young Aspirants
        </p>
        <h2 className="font-serif text-3xl font-extrabold leading-[1.1] tracking-tight text-white uppercase sm:text-4xl lg:text-5xl">
          Don&apos;t just teach flight theory.
          <br />
          Launch the aircraft.
        </h2>
        <p className="mt-5 text-sm leading-relaxed text-white/80 sm:text-base">
          A pilot doesn&apos;t earn their wings by filing a flight manual at the
          deadline. They log real flight hours alongside seasoned navigators
          until their vessel clears every checkpoint.
        </p>
      </div>

      <div className="pointer-events-none relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-stone-400">
        <span>Pre‑Incubation &amp; Mentorship Portal · Prabodh Edutech</span>
      </div>
    </section>
  );
}
