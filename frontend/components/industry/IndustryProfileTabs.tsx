"use client";

import { useRef, useState } from "react";
import { LayoutDashboardIcon, CpuIcon, TrophyIcon } from "../dashboard/icons";
import IndustryOverviewPanel from "./IndustryOverviewPanel";
import IndustryExpertisePanel from "./IndustryExpertisePanel";
import IndustryTrackRecordPanel from "./IndustryTrackRecordPanel";

type TabName = "overview" | "expertise" | "record";

const tabs: { key: TabName; label: string; icon: typeof LayoutDashboardIcon }[] = [
  { key: "overview", label: "Mentorship Overview", icon: LayoutDashboardIcon },
  { key: "expertise", label: "Domain & Industry Expertise", icon: CpuIcon },
  { key: "record", label: "Engagement Track Record", icon: TrophyIcon },
];

export default function IndustryProfileTabs() {
  const [active, setActive] = useState<TabName>("overview");
  const tabRefs = useRef<Record<TabName, HTMLButtonElement | null>>({ overview: null, expertise: null, record: null });

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((t) => t.key === active);
    let nextIndex = index;
    if (e.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = tabs.length - 1;
    else return;
    e.preventDefault();
    const next = tabs[nextIndex].key;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="space-y-0">
      {/* Tab Strip */}
      <div className="border-b border-neutral-200">
        <div role="tablist" aria-label="Profile sections" onKeyDown={onKeyDown} className="-mb-px flex gap-6 overflow-x-auto max-sm:[&>*]:shrink-0 max-sm:[&>*]:whitespace-nowrap">
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
                tabIndex={isActive ? 0 : -1}
                ref={(el) => {
                  tabRefs.current[tab.key] = el;
                }}
                onClick={() => setActive(tab.key)}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-[#d95c26] text-[#d95c26]"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <tab.icon className={`h-4 w-4 ${isActive ? "text-[#d95c26]" : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="pt-6" role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} tabIndex={0}>
        {active === "overview" && <IndustryOverviewPanel />}
        {active === "expertise" && <IndustryExpertisePanel />}
        {active === "record" && <IndustryTrackRecordPanel />}
      </div>
    </div>
  );
}