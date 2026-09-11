"use client";

import { useState } from "react";
import { useProfile } from "./ProfileProvider";
import {
  CodeIcon,
  RocketIcon,
  AwardIcon,
  BriefcaseIcon,
  TrophyIcon,
} from "./icons";
import SkillsPanel from "./SkillsPanel";
import ProjectsPanel from "./ProjectsPanel";
import CertificationsPanel from "./CertificationsPanel";
import ExperiencePanel from "./ExperiencePanel";
import AchievementsPanel from "./AchievementsPanel";

type TabName = "skills" | "projects" | "certifications" | "experience" | "achievements";

const tabs: { key: TabName; label: string; icon: typeof CodeIcon; count?: number }[] = [
  { key: "skills", label: "Skills", icon: CodeIcon },
  { key: "projects", label: "Projects", icon: RocketIcon },
  { key: "certifications", label: "Certifications", icon: AwardIcon },
  { key: "experience", label: "Experience", icon: BriefcaseIcon },
  { key: "achievements", label: "Achievements", icon: TrophyIcon },
];

export default function ProfileTabs() {
  const { profile } = useProfile();
  const [active, setActive] = useState<TabName>("skills");

  return (
    <div className="space-y-0">
      {/* Tab Strip */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-brand-softline sm:gap-6">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          const count =
            tab.key === "projects"
              ? profile.projects.length
              : tab.key === "certifications"
                ? profile.certifications.length
                : tab.key === "experience"
                  ? profile.experience.length
                  : tab.key === "achievements"
                    ? profile.achievements.length
                    : undefined;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              id={`tab-${tab.key}`}
              onClick={() => setActive(tab.key)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-2 text-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-primary ${
                isActive
                  ? "border-brand-primary font-bold text-brand-deep"
                  : "border-transparent font-medium text-brand-muted hover:text-brand-primary"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {count !== undefined && (
                <span className="rounded-full bg-brand-softline px-1.5 py-0.5 text-[10px] text-brand-muted">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="pt-6">
        {active === "skills" && (
          <div role="tabpanel" id="panel-skills" aria-labelledby="tab-skills">
            <SkillsPanel />
          </div>
        )}
        {active === "projects" && (
          <div role="tabpanel" id="panel-projects" aria-labelledby="tab-projects">
            <ProjectsPanel />
          </div>
        )}
        {active === "certifications" && (
          <div role="tabpanel" id="panel-certifications" aria-labelledby="tab-certifications">
            <CertificationsPanel />
          </div>
        )}
        {active === "experience" && (
          <div role="tabpanel" id="panel-experience" aria-labelledby="tab-experience">
            <ExperiencePanel />
          </div>
        )}
        {active === "achievements" && (
          <div role="tabpanel" id="panel-achievements" aria-labelledby="tab-achievements">
            <AchievementsPanel />
          </div>
        )}
      </div>
    </div>
  );
}
