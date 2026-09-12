"use client";

import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "./icons";
import ParticleField from "./ParticleField";

const features = [
  {
    title: "Team Formation & Problem Lock",
    desc: "Team rosters, invites, and join-request approvals tied to a finalized, mentor-approved problem statement.",
  },
  {
    title: "Dual Mentor Tracking",
    desc: "Institute & industry mentor allocation, review gates, and milestone deliverable submission tracking.",
  },
  {
    title: "Rubric-Based Scoring",
    desc: "Multi-criteria evaluations with grades, publish workflow, and live progress across evaluated teams.",
  },
  {
    title: "Admin Evaluation Console",
    desc: "Stage & rubric configuration, mentor allocation, broadcasts, and aggregated platform reports.",
  },
];

export default function Hero() {
  return (
    <section
      id="home"
      className="hero-pattern relative overflow-hidden px-4 pb-16 pt-12 text-white sm:px-6 sm:pb-24 sm:pt-16 lg:px-8 lg:pb-32 lg:pt-20"
    >
      <div className="absolute inset-0 z-0">
        <ParticleField
          idleAlpha={0.22}
          hoverAlpha={0.9}
          baseSize={1.8}
          hoverSize={3}
          hoverDisplacement={28}
          influenceRadius={220}
        />
      </div>

      <div className="watermark-text absolute right-[-5%] top-1/4 font-serif text-[20vw] font-black leading-none tracking-tighter text-white/[0.03]">
        Prabodh
      </div>

      <div className="relative z-10 mx-auto max-w-7xl pointer-events-none">
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium tracking-wide text-brand-cream shadow-inner backdrop-blur-sm sm:text-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-amber"></span>
            Prabodh Incubation Portal 2026
          </div>
          <h1 className="mb-5 text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Prabodh Incubation <br className="hidden sm:inline" />
            &amp; Mentorship Portal
          </h1>
          <p className="mx-auto max-w-2xl text-base font-normal leading-relaxed text-white/80 sm:text-xl">
            Centralized submission, dual-mentor tracking, and milestone-based evaluation for all incubating projects.
          </p>
        </div>

        <div
          id="sih-card"
          className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-brand-sand bg-white p-6 text-brand-charcoal shadow-2xl transition-all duration-300 hover:shadow-orange-950/20 sm:p-10 lg:p-12"
        >
          <div className="absolute left-0 right-0 top-0 h-2 bg-gradient-to-r from-brand-deep via-brand-primary to-brand-amber"></div>

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center rounded-lg border border-brand-primary/20 bg-brand-lightOrange px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-primary">
              Academic Hackathon Portal
            </span>
            <div className="flex items-center gap-2 text-xs font-medium text-brand-charcoal/70">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-approved"></span>
              <span>2026 Phase: Internal Institute Qualifier Active</span>
            </div>
          </div>

          <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-brand-deep sm:text-3xl">
            Prabodh Incubation Portal
          </h2>
          <p className="mb-8 text-base leading-relaxed text-brand-charcoal/85 sm:text-lg">
            All-in-one workspace for team formation (up to 6 members), problem statement lock-in, institute
            and industry mentorship tracking, and multi-round rubric scoring.
          </p>

          <div className="mb-10 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3.5 rounded-xl border border-brand-sand/80 bg-brand-cream p-3.5"
              >
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                  <CheckIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-brand-deep">{feature.title}</h4>
                  <p className="mt-0.5 text-xs text-brand-charcoal/75">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Link
              href="/login/student"
              className="group inline-flex w-full transform items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-hover hover:shadow-xl pointer-events-auto sm:gap-3 sm:px-6 sm:py-4 sm:text-base md:text-lg"
            >
              <span className="whitespace-nowrap">Access Prabodh Portal</span>
              <ArrowRightIcon className="h-5 w-5 shrink-0 transform transition-transform duration-200 group-hover:translate-x-1.5" />
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-sm font-semibold text-brand-deep sm:gap-8">
              <Link href="/login/student" className="flex items-center gap-1.5 transition-colors hover:text-brand-primary pointer-events-auto">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-primary"></span>
                Student Login
              </Link>
              <span className="hidden text-brand-sand sm:inline-block">•</span>
              <Link href="/login/faculty" className="flex items-center gap-1.5 transition-colors hover:text-brand-primary pointer-events-auto">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-primary"></span>
                Mentor Login
              </Link>
              <span className="hidden text-brand-sand sm:inline-block">•</span>
              <Link href="/login/faculty" className="flex items-center gap-1.5 transition-colors hover:text-brand-primary pointer-events-auto">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-primary"></span>
                Nodal Admin Console
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}