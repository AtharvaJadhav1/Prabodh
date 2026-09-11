"use client";

import type { StageConfig, RubricCriterion } from "../../data/adminDashboard";
import ItemListEditor from "../profile/ItemListEditor";
import TextInput from "../profile/TextInput";

type Props = {
  stage: StageConfig;
  onUpdate: (patch: Partial<StageConfig>) => void;
  onUpdateRubric: (rubricCriteria: RubricCriterion[]) => void;
};

const statusStyles: Record<StageConfig["status"], string> = {
  active: "border-brand-approved/20 bg-brand-approved/10 text-brand-approved",
  upcoming: "border-brand-warmBorder bg-brand-lightOrange text-brand-primary",
  closed: "border-brand-sand bg-brand-cream text-brand-muted",
};

export default function StageRubricEditor({ stage, onUpdate, onUpdateRubric }: Props) {
  return (
    <div className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-brand-sand pb-4">
        <div>
          <h3 className="text-base font-bold text-brand-deep">{stage.name}</h3>
          <p className="mt-0.5 text-xs text-brand-muted">Order {stage.order}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusStyles[stage.status]}`}>
          {stage.status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 pb-5 sm:grid-cols-2">
        <TextInput label="Deadline" value={stage.deadline} onChange={(v) => onUpdate({ deadline: v })} />
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-brand-deep">Status</label>
          <select
            value={stage.status}
            onChange={(e) => onUpdate({ status: e.target.value as StageConfig["status"] })}
            className="w-full rounded-xl border border-brand-sand bg-white px-4 py-2.5 text-sm font-medium text-brand-charcoal shadow-sm transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
          >
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-brand-deep">Rubric Criteria</label>
      <ItemListEditor<RubricCriterion>
        items={stage.rubricCriteria}
        onChange={onUpdateRubric}
        addLabel="Add Rubric Criterion"
        itemLabel="Criterion"
        createEmpty={() => ({ label: "", maxScore: 10 })}
        renderItem={(item, update) => (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
            <TextInput label="Label" value={item.label} onChange={(v) => update({ label: v })} placeholder="e.g. Innovation" />
            <TextInput
              label="Max Score"
              type="text"
              value={String(item.maxScore)}
              onChange={(v) => update({ maxScore: Number(v.replace(/\D/g, "")) || 0 })}
            />
          </div>
        )}
      />
    </div>
  );
}
