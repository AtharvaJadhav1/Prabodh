import { ShieldCheckIcon } from "../icons";

type Ps = {
  code: string;
  title: string;
  theme: string;
  description: string;
};

export default function PsDetailCard({ ps, statusLabel }: { ps: Ps; statusLabel: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      <div className="absolute left-0 right-0 top-0 h-1.5 bg-brand-primary" />
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-1 font-mono text-xs font-bold text-brand-deep">
          {ps.code}
        </span>
        <span className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-1 text-[11px] font-bold uppercase text-brand-deep">
          {ps.theme}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-brand-approved/20 bg-brand-approved/10 px-2.5 py-1 text-[11px] font-bold uppercase text-brand-approved">
          <ShieldCheckIcon className="h-3.5 w-3.5" />
          {statusLabel}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-bold tracking-tight text-brand-deep sm:text-xl">{ps.title}</h3>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-muted">{ps.description}</p>
    </div>
  );
}
