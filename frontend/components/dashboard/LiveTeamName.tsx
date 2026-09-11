"use client";

import { useTeam } from "./TeamProvider";

export default function LiveTeamName({ fallback = "your team" }: { fallback?: string }) {
  const { teamName, teamId } = useTeam();
  return <span className="font-semibold text-brand-charcoal">{teamId ? teamName : fallback}</span>;
}
