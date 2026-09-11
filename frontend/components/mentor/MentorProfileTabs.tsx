"use client";

import { useState } from "react";
import {
  LayoutDashboardIcon,
  CpuIcon,
  TrophyIcon,
} from "../dashboard/icons";
import MentorshipOverviewPanel from "./MentorshipOverviewPanel";
import MentorExpertisePanel from "./MentorExpertisePanel";
import MentorTrackRecordPanel from "./MentorTrackRecordPanel";

type TabName = "overview" | "expertise" | "record";

const tabs: { key: TabName; label: string; icon: typeof LayoutDashboardIcon }[] = [
  { key: "overview", label: "Mentorship Overview", icon: LayoutDashboardIcon },
  { key: "expertise", label: "Domain Expertise", icon: CpuIcon },
  { key: "record", label: "Track Record", icon: TrophyIcon },
];

export default function MentorProfileTabs() {
  const [active, setActive] = useState<TabName>("overview");

  return (
    <div className="space-y-0">
      {/* Tab Strip */}
      <div className="flex items-center justify-between border-b border-brand-sand">
        <nav aria-label="Tabs" className="-mb-px flex space-x-6">
          {tabs.map((tab) => {
            const isActive = tab.key === active;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.key}`}
                id={`tab-${tab.key}`}
                onClick={() => setActive(tab.key)}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-xs transition-all sm:text-sm ${
                  isActive
                    ? "border-brand-primary font-bold text-brand-deep"
                    : "border-transparent font-semibold text-brand-muted hover:border-brand-sand hover:text-brand-deep"
                }`}
              >
                <tab.icon className={`h-4 w-4 ${isActive ? "text-brand-primary" : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="pt-6">
        {active === "overview" && <MentorshipOverviewPanel />}
        {active === "expertise" && <MentorExpertisePanel />}
        {active === "record" && <MentorTrackRecordPanel />}
      </div>
    </div>
  );
}
