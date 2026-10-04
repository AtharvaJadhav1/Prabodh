export default function AuthFooter() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-between gap-2 border-t border-brand-sand pt-6 text-xs text-brand-muted sm:flex-row">
      <p className="text-center sm:text-left">© 2026 Prabodh. All rights reserved.</p>
      <a
        href="/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-brand-muted hover:text-brand-primary"
      >
        Privacy Policy
      </a>
    </div>
  );
}