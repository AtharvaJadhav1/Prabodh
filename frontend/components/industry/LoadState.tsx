"use client";

type BannerProps = {
  message: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorBanner({ message, onRetry, className = "" }: BannerProps) {
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 ${className}`}
    >
      <span className="min-w-0 break-words">{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-red-300 bg-white px-3 py-1 max-sm:py-2 text-xs font-bold text-red-700 hover:bg-red-100"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function SkeletonRows({ rows = 3, label = "Loading…" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl border border-brand-sand bg-brand-cream" />
      ))}
    </div>
  );
}
