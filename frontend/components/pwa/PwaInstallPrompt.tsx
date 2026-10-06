"use client";

import React, { useEffect, useState } from "react";
import { DownloadIcon, SmartphoneIcon, Share2Icon, XIcon } from "../dashboard/icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    const alreadyInstalled = localStorage.getItem("pwa_installed") === "true";

    if (isStandalone || alreadyInstalled) {
      return;
    }

    const sessionDismissed = sessionStorage.getItem("pwa_prompt_dismissed_session") === "true";
    if (sessionDismissed) {
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      setIsVisible(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      localStorage.setItem("pwa_installed", "true");
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem("pwa_installed", "true");
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa_prompt_dismissed_session", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <>
      <aside
        aria-label="Install App"
        className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100%-2.5rem)] animate-in fade-in slide-in-from-bottom-3 duration-300"
      >
        <div className="flex items-center justify-between gap-3 p-3.5 bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/90 shadow-lg text-stone-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center justify-center shrink-0 text-[#D95D28]">
              <SmartphoneIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-stone-900 leading-tight">
                Install Prabodh App
              </p>
              <p className="text-[11px] text-stone-500 truncate">
                Get fast access and quick alerts on your home screen.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-[#D95D28] hover:bg-[#c24f1e] text-white text-xs font-semibold transition flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg transition"
              title="Dismiss for now"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 border border-stone-200 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-stone-900">Install on iPhone / iPad</h3>
              <button
                type="button"
                onClick={() => setShowIOSInstructions(false)}
                className="p-1 text-stone-400 hover:text-stone-600"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Safari does not support 1-click installation. Follow these quick steps:
            </p>
            <ol className="text-xs text-stone-700 space-y-2 list-decimal list-inside bg-stone-50 p-3 rounded-xl border border-stone-200/60">
              <li>Tap the <Share2Icon className="w-3.5 h-3.5 inline mx-1 text-blue-600" /> <strong>Share</strong> button in Safari&apos;s bottom bar.</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
              <li>Tap <strong>"Add"</strong> at the top-right corner.</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSInstructions(false)}
              className="w-full py-2 rounded-xl bg-stone-900 text-white text-xs font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}