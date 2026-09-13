"use client";

import AdminShell from "../../../../components/admin/AdminShell";
import StageRubricEditor from "../../../../components/admin/StageRubricEditor";
import { useAdmin } from "../../../../components/admin/AdminProvider";

export default function AdminStagesRubricsPage() {
  const { stages, updateStage, updateStageRubric } = useAdmin();

  return (
    <AdminShell title="Stages & Rubrics">
      <div className="mx-auto max-w-4xl space-y-6">
        {stages.map((stage) => (
          <StageRubricEditor
            key={stage.id}
            stage={stage}
            onUpdate={(patch) => updateStage(stage.id, patch)}
            onUpdateRubric={(rubricCriteria) => updateStageRubric(stage.id, rubricCriteria)}
          />
        ))}
      </div>
    </AdminShell>
  );
}
