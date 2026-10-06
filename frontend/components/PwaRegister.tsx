"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SparklesIcon, WifiOffIcon, CheckIcon, RefreshIcon } from "./icons-pwa";

export default function PwaRegister() {
  const [standalone, setStandalone] = useState(false);
  const [offline, setOffline] = useState(false);
  const [offlineToastSeen, setOfflineToastSeen] = useState(true);
  const [swReady, setSwReady] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const wasOffline = useRef(false);
  const pathname = usePathname();

  // Register the service worker (HTTPS or localhost only).
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (
      !/^https:/.test(window.location.protocol) &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      return;
    }

    let active = true;
    const hadController = Boolean(navigator.serviceWorker.controller);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (!active) return;
        void navigator.serviceWorker.ready.then(() => {
          if (!active) return;
          try {
            if (sessionStorage.getItem("sih-sw-ready") !== "1") {
              sessionStorage.setItem("sih-sw-ready", "1");
              setSwReady(true);
            }
          } catch {
            setSwReady(true);
          }
        });
        // A newer worker overriding the current one signals an update to activate.
        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            if (active && next.state === "activated" && hadController) setUpdateReady(true);
          });
        });
      })
      .catch(() => {
        /* SW registration blocked (e.g. private mode) — non-fatal */
      });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (navigator.serviceWorker.controller) setSwReady(false);
    });

    return () => {
      active = false;
    };
  }, []);

  // Install prompt + online/offline detection + auto-refresh on reconnect.
  useEffect(() => {
    if (typeof window === "undefined") return;

    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true
    );

    const onOffline = () => {
      wasOffline.current = true;
      setOffline(true);
      setOfflineToastSeen(false);
    };
    const onOnline = () => {
      const reconnecting = wasOffline.current;
      setOffline(false);
      wasOffline.current = false;
      // Auto-refresh dashboards once connectivity returns.
      if (reconnecting && pathname.startsWith("/dashboard")) {
        setRefreshing(true);
        window.setTimeout(() => window.location.reload(), 1200);
      }
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [pathname]);

  if (standalone) return null;

  const showOffline = offline && !offlineToastSeen;
  const showReady = swReady;
  const showUpdate = updateReady;
  const showRefreshing = refreshing;

  if (!showOffline && !showReady && !showUpdate && !showRefreshing) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2">
      {showUpdate && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-2xl bg-brand-deep px-4 py-2.5 text-xs font-bold text-white shadow-xl shadow-brand-deep/20"
        >
          <RefreshIcon className="h-4 w-4 text-brand-amber" />
          New version ready — tap to reload
        </button>
      )}

      {showRefreshing && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-2xl bg-brand-deep px-4 py-2.5 text-xs font-bold text-white shadow-xl shadow-brand-deep/20"
        >
          <RefreshIcon className="h-4 w-4 animate-spin text-brand-amber" />
          Back online — refreshing…
        </button>
      )}

      {showReady && (
        <button
          type="button"
          onClick={() => setSwReady(false)}
          className="flex items-center gap-2 rounded-2xl bg-brand-deep px-4 py-2.5 text-xs font-bold text-white shadow-xl shadow-brand-deep/20"
        >
          <CheckIcon className="h-4 w-4 text-brand-amber" />
          Ready for offline use
        </button>
      )}

      {showOffline && (
        <button
          type="button"
          onClick={() => setOfflineToastSeen(true)}
          className="flex items-center gap-2 rounded-2xl bg-brand-deep px-4 py-2.5 text-xs font-bold text-white shadow-xl shadow-brand-deep/20"
        >
          <WifiOffIcon className="h-4 w-4 text-brand-amber" />
          You&apos;re offline — showing cached views
        </button>
      )}

      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-brand-muted opacity-70">
        <SparklesIcon className="h-3 w-3" /> PWA Enabled
      </span>
    </div>
  );
}