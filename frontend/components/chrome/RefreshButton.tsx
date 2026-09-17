"use client";

import { useState } from "react";
import { clearApiCache } from "../../lib/api-cache";
import { RefreshIcon } from "../icons-pwa";

export default function RefreshButton() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      clearApiCache();
      if (navigator.onLine) {
        // Clear the cached app shell so the reload pulls fresh HTML.
        if ("caches" in window) {
          try {
            await caches.delete("sih-portal-shell-v2");
          } catch {
            /* no-op */
          }
        }
        if ("serviceWorker" in navigator) {
          try {
            const reg = await navigator.serviceWorker.getRegistration();
            await reg?.update();
          } catch {
            /* no-op */
          }
        }
      }
    } catch {
      /* no-op */
    }
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={refreshing}
      aria-label="Refresh from server"
      title="Refresh from server"
      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-brand-sand bg-white px-3 text-xs font-bold text-brand-deep transition-all duration-200 hover:bg-brand-cream active:scale-95 disabled:opacity-60"
    >
      <RefreshIcon
        className={`h-4 w-4 text-brand-muted transition-transform duration-500 ease-in-out hover:rotate-180 ${
          refreshing ? "animate-spin" : ""
        }`}
      />
      <span className="hidden sm:inline">Refresh</span>
    </button>
  );
}