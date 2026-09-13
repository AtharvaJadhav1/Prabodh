"use client";

import { useEffect, useState } from "react";
import RepositoryBrowser from "./RepositoryBrowser";
import ManualEntryForm from "./ManualEntryForm";
import { api } from "../../../lib/api";

type Tab = "repo" | "manual";

export default function ProblemStatementTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("repo");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    void api<{ items?: unknown[]; total?: number }>("/problem-statements?limit=1")
      .then((res) => setCount(typeof res.total === "number" ? res.total : res.items?.length ?? null))
      .catch(() => setCount(null));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-xl border border-brand-softline bg-brand-cream p-1">
          <button
            type="button"
            onClick={() => setActiveTab("repo")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all sm:flex-initial ${
              activeTab === "repo"
                ? "bg-white text-brand-primary shadow-sm"
                : "text-brand-muted hover:text-brand-deep"
            }`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Browse Prabodh Repository</span>
            <span className="rounded-full bg-brand-approved/10 px-2 py-0.5 font-mono text-[10px] font-bold text-brand-approved">
              {count ?? "Live"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all sm:flex-initial ${
              activeTab === "manual"
                ? "bg-white text-brand-primary shadow-sm font-bold"
                : "text-brand-muted hover:text-brand-deep"
            }`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Manual Entry / Student Innovation Idea</span>
          </button>
        </div>
      </div>

      {activeTab === "repo" ? <RepositoryBrowser /> : <ManualEntryForm />}
    </div>
  );
}
