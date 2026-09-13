import { InfoIcon, ExternalLinkIcon } from "../dashboard/icons";

export default function GuidelinesBanner() {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-brand-cream border border-brand-sand gap-4 mt-8">
      <div className="flex items-start md:items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-sand bg-white text-brand-deep">
          <InfoIcon className="h-4 w-4 text-brand-primary" />
        </div>
        <div>
          <p className="text-xs font-bold text-brand-deep">Prabodh Evaluation Rubric (AICTE &amp; MoE Innovation Cell)</p>
          <p className="text-brand-muted">
            Grading criteria: Innovation (25%), Technical Feasibility (30%), Market Viability (20%), and Presentation (25%).
          </p>
        </div>
      </div>
      <a
        href="#"
        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:underline"
      >
        <span>Download Official Rubrics PDF</span>
        <ExternalLinkIcon className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
