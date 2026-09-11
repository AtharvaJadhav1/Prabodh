"use client";

import { useEffect, useState } from "react";
import { XIcon, SparklesIcon, WifiOffIcon, PowerIcon, CheckIcon } from "./icons-pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [offline, setOffline] = useState(false);
  const [swToast, setSwToast] = useState(false);
  const [offlineToastSeen, setOfflineToastSeen] = useState(true);
  const [installDismissed, setInstallDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Auth was breaking due to stale SW caches — unregister all workers for now.
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      void Promise.all(regs.map((r) => r.unregister()));
    });
    if ("caches" in window) {
      void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
    }

    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true
    );

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstallPrompt(null);
      setStandalone(true);
    };
    const onOffline = () => {
      setOffline(true);
      setOfflineToastSeen(false);
    };
    const onOnline = () => setOffline(false);

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (standalone) return null;

  const showInstall = installPrompt && !installDismissed;
  const showOffline = offline && !offlineToastSeen;
  const showReady = swToast && !offlineToastSeen;

  if (!showInstall && !showOffline && !showReady) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2">
      {showInstall && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand-sand bg-white p-3 shadow-xl shadow-brand-deep/15">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <PowerIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-brand-deep">Install SIH Portal</p>
            <p className="text-xs font-medium text-brand-muted">Add to your home screen for instant access.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-xl bg-brand-primary px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-hover"
            >
              Install
            </button>
            <button
              type="button"
              onClick={() => setInstallDismissed(true)}
              className="rounded-xl border border-brand-sand p-2 text-brand-muted transition-colors hover:text-brand-deep"
              aria-label="Dismiss install prompt"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showReady && (
        <button
          type="button"
          onClick={() => setSwToast(false)}
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
          You&apos;re offline — browsing saved pages
        </button>
      )}

      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-brand-muted opacity-70">
        <SparklesIcon className="h-3 w-3" /> PWA Enabled
      </span>
    </div>
  );
}