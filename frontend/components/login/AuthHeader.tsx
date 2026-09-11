import Image from "next/image";
import Link from "next/link";

export default function AuthHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-brand-sand/80 pb-6">
      <div className="flex min-w-0 items-center">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/images/logo/Prabodh_Horizontal_Logo_Web_1000px.png"
            alt="Prabodh"
            width={1000}
            height={233}
            priority
            className="h-10 w-auto sm:h-12"
          />
        </Link>
      </div>
      <Link
        href="/"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-sand px-3 py-1.5 text-xs font-semibold text-brand-deep shadow-sm transition-all duration-200 hover:border-brand-amber hover:bg-white"
      >
        Incubation Home
      </Link>
    </div>
  );
}