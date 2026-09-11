import Link from "next/link";

export default function AuthFooter() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-between gap-2 border-t border-brand-sand pt-6 text-xs text-brand-muted sm:flex-row">
      <p className="text-center sm:text-left">© 2026 MIT Art, Design and Technology University, Pune</p>
      <div className="flex items-center gap-3 sm:gap-2">
        <Link href="/#hackathon-stages" className="transition-colors hover:text-brand-primary">
          SIH Guidelines
        </Link>
        <span>•</span>
        <Link href="/#leadership" className="transition-colors hover:text-brand-primary">
          IT Support
        </Link>
      </div>
    </div>
  );
}