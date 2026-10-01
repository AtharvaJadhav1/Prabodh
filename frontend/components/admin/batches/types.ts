import type { TeamStatus } from "../StatusPill";

/** The slice of a team the batch screens need. */
export type BatchTeam = {
  id: string;
  teamCode: string;
  name: string;
  theme?: string | null;
  institute: string;
  status: TeamStatus;
  memberCap: number;
  _count?: { members: number };
};

export type BatchSummary = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  createdBy?: { id: string; fullName: string } | null;
  teamCount: number;
};

export type BatchDetail = Omit<BatchSummary, "teamCount"> & { teams: BatchTeam[] };

export const BATCHES_HREF = "/dashboard/admin/teams/batches";
