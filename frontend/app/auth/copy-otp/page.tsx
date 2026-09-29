"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * One-click copy landing page for OTP / password buttons in transactional emails.
 * The secret lives in the URL hash only (never sent to the server).
 */
export default function CopyOtpPage() {
  const [status, setStatus] = useState<"copying" | "ok" | "empty" | "error">("copying");
  const [value, setValue] = useState("");

  useEffect(() => {
    const raw = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    const decoded = raw ? decodeURIComponent(raw) : "";
    if (!decoded) {
      setStatus("empty");
      return;
    }
    setValue(decoded);
    void (async () => {
      try {
        await navigator.clipboard.writeText(decoded);
        setStatus("ok");
      } catch {
        try {
          const ta = document.createElement("textarea");
          ta.value = decoded;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          setStatus("ok");
        } catch {
          setStatus("error");
        }
      }
    })();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-canvas px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-brand-softline bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex items-center justify-center gap-3">
          <Image
            src="/images/logo/Prabodh_Icon_Only_Web_1000px.png"
            alt="Prabodh"
            width={40}
            height={40}
            className="h-10 w-10 rounded-full border border-brand-sand object-cover"
          />
          <div className="text-left">
            <p className="text-xl font-extrabold tracking-tight text-brand-deep">Prabodh.</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
              Student Portal
            </p>
          </div>
        </div>

        {status === "copying" ? (
          <p className="text-sm font-medium text-brand-muted">Copying…</p>
        ) : null}

        {status === "ok" ? (
          <>
            <p className="text-lg font-bold text-brand-deep">Copied to clipboard</p>
            <p className="mt-3 rounded-xl bg-brand-lightOrange px-4 py-3 font-mono text-2xl font-bold tracking-[0.28em] text-brand-primary">
              {value}
            </p>
            <p className="mt-3 text-sm text-brand-muted">Paste it into the verification field to continue.</p>
          </>
        ) : null}

        {status === "empty" ? (
          <p className="text-sm font-medium text-brand-muted">No code found in this link.</p>
        ) : null}

        {status === "error" ? (
          <>
            <p className="text-lg font-bold text-brand-deep">Copy this code manually</p>
            <p className="mt-3 select-all rounded-xl bg-brand-lightOrange px-4 py-3 font-mono text-2xl font-bold tracking-[0.28em] text-brand-primary">
              {value}
            </p>
          </>
        ) : null}

        <Link
          href="/login"
          className="mt-8 inline-flex rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
