import Image from "next/image";

const portalLinks = [
  { label: "Student Team Dashboard", href: "/login/student" },
  { label: "Dual Mentorship Rubric Matrix", href: "/login/faculty" },
  { label: "Internal Hackathon Qualifier Rules", href: "#hackathon-stages" },
  { label: "Nodal Admin Evaluation Console", href: "/login/faculty" },
  { label: "MoE SIH Problem Statement Repository", href: "#hackathon-stages" },
];

const resourceLinks = [
  { label: "Official SIH Portal (sih.gov.in)", href: "https://sih.gov.in" },
  { label: "Ministry of Education's Innovation Cell (MIC)", href: "https://mic.gov.in" },
  { label: "Atal Incubation Centre (AIC-MIT ADT)", href: "https://aic.mituniversity.edu.in" },
  { label: "MIT-ADT University Main Website", href: "https://www.mituniversity.ac.in" },
  { label: "SIH Student Grievance & Help Desk", href: "#helpdesk" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[#753c15] bg-brand-deep pb-12 pt-16 text-brand-cream">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Image
                src="/images/logo/Prabodh_Icon_Only_Web_1000px.png"
                alt="Prabodh emblem"
                width={1000}
                height={1002}
                className="h-10 w-auto"
              />
              <div>
                <h4 className="text-sm font-extrabold uppercase tracking-wide text-white">MIT-ADT University</h4>
                <p className="text-[11px] font-medium text-brand-amber">Pune, Maharashtra, India</p>
              </div>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-brand-cream/80">
              Smart India Hackathon Nodal Operational Cell, Centre for Research, Innovation, Entrepreneurship &amp;
              Youth Activities (CRIEYA).
            </p>
            <div className="space-y-2 text-xs text-brand-cream/90">
              <p className="flex items-center gap-2">
                <span className="text-brand-amber">Email:</span> sih.nodal@mituniversity.edu.in
              </p>
              <p className="flex items-center gap-2">
                <span className="text-brand-amber">Phone:</span> +91 (020) 3027 3400 / 3600
              </p>
              <p className="flex items-center gap-2">
                <span className="text-brand-amber">Campus:</span> Rajbaug, Loni Kalbhor, Pune - 412201
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-4 border-b border-brand-amber/40 pb-1 text-sm font-bold uppercase tracking-wider text-white">
              Portal &amp; Stages
            </h4>
            <ul className="space-y-2.5 text-xs text-brand-cream/80">
              {portalLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="flex items-center gap-1.5 transition-colors hover:text-brand-amber"
                  >
                    <span className="text-brand-primary">›</span> {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 border-b border-brand-amber/40 pb-1 text-sm font-bold uppercase tracking-wider text-white">
              External Resources
            </h4>
            <ul className="space-y-2.5 text-xs text-brand-cream/80">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex items-center gap-1.5 transition-colors hover:text-brand-amber"
                  >
                    <span className="text-brand-primary">›</span> {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 border-b border-brand-amber/40 pb-1 text-sm font-bold uppercase tracking-wider text-white">
              Platform Engine
            </h4>
            <p className="mb-3 text-xs leading-relaxed text-brand-cream/80">
              Architected for scale with Next.js App Router, Tailwind CSS, Clerk Authentication, and Prisma ORM.
            </p>
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-amber">
                Development Credits
              </span>
              <p className="mt-1 text-xs font-bold text-white">Developed by Ideabliss</p>
              <p className="mt-0.5 text-[11px] text-brand-cream/70">
                Development team: <span className="font-medium text-brand-amber">Strawhats</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-brand-approved"></span>
              <span className="text-[11px] text-brand-cream/70">System Status: All Rubrics &amp; Auth Online</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-xs text-brand-cream/60 sm:flex-row">
          <p>© 2026 MIT-ADT University, Pune. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Smart India Hackathon is an initiative by the Ministry of Education &amp; AICTE, Govt. of India.
          </p>
        </div>
      </div>
    </footer>
  );
}