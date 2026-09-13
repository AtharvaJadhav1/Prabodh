"use client";

import { useState } from "react";
import RepositoryBrowser from "./RepositoryBrowser";
import ManualEntryForm from "./ManualEntryForm";
import type { CatalogPreference, ManualPreference } from "./PreferenceSlotsPanel";

type Tab = "repo" | "manual";

type Props = {
  targetRank: number;
  usedPsIds: string[];
  onPick: (pref: CatalogPreference | ManualPreference) => void;
};

export default function ProblemStatementTabs({ targetRank, usedPsIds, onPick }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("repo");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 rounded-xl border border-brand-softline bg-brand-cream p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("repo")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "repo" ? "bg-white text-brand-primary shadow-sm" : "text-brand-muted hover:text-brand-deep"
          }`}
        >
          Browse Repository
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "manual" ? "bg-white text-brand-primary shadow-sm" : "text-brand-muted hover:text-brand-deep"
          }`}
        >
          Manual Entry
        </button>
      </div>

      {activeTab === "repo" ? (
        <RepositoryBrowser targetRank={targetRank} usedPsIds={usedPsIds} onPick={onPick} />
      ) : (
        <ManualEntryForm targetRank={targetRank} onPick={onPick} />
      )}
    </div>
  );
}
