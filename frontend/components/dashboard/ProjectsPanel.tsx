"use client";

import { useProfile } from "./ProfileProvider";
import { RocketIcon, ExternalLinkIcon, PencilIcon } from "./icons";

export default function ProjectsPanel() {
  const { profile, openDrawer } = useProfile();
  const { projects } = profile;

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-brand-softline bg-white px-6 py-16 shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
        <RocketIcon className="mb-4 h-10 w-10 text-brand-muted/40" />
        <h3 className="text-sm font-bold text-brand-deep">No projects yet</h3>
        <p className="mt-1 max-w-xs text-center text-xs text-brand-muted">
          Add your first project to showcase your work to your team and mentors.
        </p>
        <button
          type="button"
          onClick={() => openDrawer("projects")}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          + Add Project
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project, i) => (
        <div
          key={`${project.title}-${i}`}
          className="rounded-2xl border border-brand-softline bg-white p-6 shadow-[0_2px_8px_rgba(91,46,16,0.04)]"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-brand-deep">{project.title}</h3>
                {project.badge && (
                  <span className="rounded bg-brand-approved/10 px-2 py-0.5 text-[11px] font-semibold text-brand-approved">
                    {project.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-muted">
                {project.team}
                {project.role && <span> • Role: {project.role}</span>}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={project.repo}
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              >
                View Repository
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={() => openDrawer("projects")}
                className="inline-flex items-center gap-1 rounded-lg border border-brand-softline px-2.5 py-1 text-xs font-bold text-brand-charcoal/70 transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
              >
                <PencilIcon className="h-3 w-3" /> Edit
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-brand-charcoal">
            {project.description}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-brand-softline pt-3">
            {project.stack.map((tech, j) => (
              <span
                key={`${tech}-${j}`}
                className="rounded border border-brand-softline bg-brand-cream px-2.5 py-0.5 text-[11px] font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}