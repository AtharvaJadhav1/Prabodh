export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto mb-16 max-w-3xl text-center">
      <span className="mb-4 inline-flex items-center rounded-full border border-brand-primary/20 bg-brand-lightOrange px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-primary sm:px-4 sm:py-1.5">
        {eyebrow}
      </span>
      <h2 className="text-3xl font-extrabold tracking-tight text-brand-deep sm:text-4xl">{title}</h2>
      <p className="mt-3 text-base text-brand-charcoal/70 sm:text-base">{subtitle}</p>
    </div>
  );
}