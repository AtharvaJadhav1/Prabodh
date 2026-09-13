"use client";

import { useTeam } from "../TeamProvider";
import PsDetailCard from "./PsDetailCard";

export default function FinalizedPSDetail() {
  const { team } = useTeam();
  const idea = team?.ideaSubmissions?.[0];
  const ps = team?.problemStatement ?? idea?.problemStatement;

  if (!ps) return null;

  return <PsDetailCard ps={ps} statusLabel={idea?.status ?? "selected"} />;
}
