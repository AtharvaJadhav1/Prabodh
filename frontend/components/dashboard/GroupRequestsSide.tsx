import {
  GradCapIcon,
  CodeIcon,
  BriefcaseIcon,
  SparklesIcon,
  UsersRoundIcon,
} from "./icons";

export function MultidisciplinaryCard() {
  const roles = [
    {
      label: "The Hacker",
      descriptor: "(Builder)",
      accent: "bg-brand-deep text-white",
      icon: CodeIcon,
      line: "Turns ideas into reality. Owns the code, architecture, and prototypes.",
    },
    {
      label: "The Hustler",
      descriptor: "(Driver)",
      accent: "bg-brand-amber text-brand-deep",
      icon: BriefcaseIcon,
      line: "Frames the story. Owns the pitch, business model, and strategy.",
    },
    {
      label: "The Hipster",
      descriptor: "(Designer)",
      accent: "bg-brand-lightOrange text-brand-primary",
      icon: SparklesIcon,
      line: "Makes it unforgettable. Owns the UX/UI, visual identity, and polish.",
    },
  ];

  return (
    <div className="rounded-2xl border border-brand-softline bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-muted">
        <UsersRoundIcon className="h-4 w-4 text-brand-primary" /> Team Composition: The 3H&rsquo;s
      </h3>
      <ul className="mt-2 flex flex-col gap-4">
        {roles.map((role) => (
          <li key={role.label} className="flex items-start gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm ${role.accent}`}
            >
              <role.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <span className="text-sm font-bold text-brand-deep">
                {role.label} <span className="ml-1 font-medium text-brand-muted">{role.descriptor}</span>
              </span>
              <p className="mt-0.5 text-xs leading-relaxed text-brand-muted">{role.line}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MentorInvitePointer() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-brand-softline bg-white p-4 shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
        <GradCapIcon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-bold text-brand-deep">Mentor Invitations</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-brand-muted">
          Institute and industry mentor invitations now live on the dedicated{" "}
          <a href="/dashboard/student/mentors" className="font-bold text-brand-primary underline underline-offset-2">
            Mentors
          </a>{" "}
          page.
        </p>
      </div>
    </div>
  );
}