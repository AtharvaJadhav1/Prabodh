import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy — Prabodh" },
  description: "How Prabodh collects, uses, and protects student, mentor, and project data.",
};

const summary = [
  "We only collect details needed for team formation, mentor pairing, and incubation workflows.",
  "Your project IP belongs to your team.",
  "We never sell your personal data.",
];

const sections: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Information We Collect",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <span className="font-semibold text-brand-deep">Account information:</span> name, institutional email
          address, contact number, student/faculty ID, department, and academic year.
        </li>
        <li>
          <span className="font-semibold text-brand-deep">Team &amp; project data:</span> project titles, problem
          statements, abstracts, pitch decks, submission files, and repository links.
        </li>
        <li>
          <span className="font-semibold text-brand-deep">Role &amp; activity data:</span> platform activity such as
          mentor invitations, evaluation scores, attendance, and role assignments (e.g. Team Lead, Faculty Mentor).
        </li>
        <li>
          <span className="font-semibold text-brand-deep">Technical logs:</span> IP address, browser type, device
          information, and session logs for security and audit purposes.
        </li>
      </ul>
    ),
  },
  {
    title: "2. How We Use Your Information",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Managing team registration, project submissions, and hackathon workflows.</li>
        <li>Facilitating communication between students, faculty mentors, industry mentors, and evaluators.</li>
        <li>Internal institutional reporting, incubation tracking, and administrative compliance.</li>
        <li>Sending system notifications, deadline reminders, and status updates about team allocations and evaluations.</li>
      </ul>
    ),
  },
  {
    title: "3. Intellectual Property & Project Confidentiality",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <span className="font-semibold text-brand-deep">Team ownership:</span> student teams retain full ownership
          and intellectual property rights over their submitted concepts, prototypes, and code.
        </li>
        <li>
          <span className="font-semibold text-brand-deep">Confidentiality:</span> mentors, judges, and admins may
          access project materials strictly for guidance, grading, and incubation support.
        </li>
      </ul>
    ),
  },
  {
    title: "4. Data Sharing & Disclosure",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>We do not sell, rent, or monetize your personal or project data.</li>
        <li>
          Data is accessible only to authorized internal stakeholders — assigned mentors, hackathon evaluators, and
          system administrators.
        </li>
        <li>
          We rely on essential third-party infrastructure (e.g. database hosting, cloud storage, transactional email
          services) solely to operate the platform.
        </li>
        <li>
          We use Cloudflare Turnstile (in invisible mode) to protect the platform from bots and abuse. When you submit
          a form, Turnstile processes technical signals such as your IP address and browser characteristics. Cloudflare
          handles this data under its{" "}
          <a
            href="https://www.cloudflare.com/turnstile-privacy-policy/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-primary hover:text-brand-hover"
          >
            Turnstile Privacy Addendum
          </a>
          .
        </li>
      </ul>
    ),
  },
  {
    title: "5. Data Security & Storage",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Data is encrypted in transit (HTTPS/TLS) and stored in a secure database.</li>
        <li>
          Role-based access controls (RBAC) ensure students, mentors, and administrators only access data relevant
          to their role.
        </li>
      </ul>
    ),
  },
  {
    title: "6. User Rights & Data Retention",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>You can view and update your profile details via your dashboard settings.</li>
        <li>Account deletion or data export requests can be routed to the platform administrators.</li>
        <li>Project records and evaluation histories are retained in accordance with university academic audit guidelines.</li>
      </ul>
    ),
  },
  {
    title: "7. Contact Information",
    body: (
      <p>
        For privacy concerns or data requests, contact us at{" "}
        <a href="mailto:support@prabodh.app" className="font-semibold text-brand-primary hover:text-brand-hover">
          support@prabodh.app
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen break-words bg-brand-cream px-4 py-12 max-sm:py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <a href="/login" className="text-sm font-semibold text-brand-primary hover:text-brand-hover">
          ← Back to sign in
        </a>

        <h1 className="mt-6 font-serif text-3xl font-bold tracking-tight text-brand-deep sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-brand-muted">Last updated: October 2026</p>

        <div className="mt-8 rounded-2xl border border-brand-sand bg-white p-6 max-sm:p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-deep">In short</p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-brand-muted">
            {summary.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-brand-muted">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 font-serif text-xl font-bold text-brand-deep">{section.title}</h2>
              {section.body}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
