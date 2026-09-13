export type PortalUser = {
  id: string;
  fullName: string;
  email: string;
  platformRole: string;
  institute?: string | null;
  department?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
};

export type PortalComment = {
  id: string;
  message: string;
  createdAt: string;
  author?: { id: string; fullName: string; email: string } | null;
};

export type PortalDeliverable = {
  id: string;
  version: number;
  pptUrl?: string | null;
  reportUrl?: string | null;
  videoUrl?: string | null;
  githubUrl?: string | null;
  submittedAt: string;
  stageId?: string;
  locked?: boolean;
};

export type PortalStage = {
  id: string;
  name: string;
  sequence: number;
  deadline: string;
  isActive: boolean;
  rubrics: Array<{ id: string; criteria: string; weightage: string | number }>;
};

export type PortalTeam = {
  id: string;
  teamCode: string;
  name: string;
  institute: string;
  theme?: string | null;
  memberCap: number;
  leaderUserId: string;
  status: string;
  mentorLockedAt?: string | null;
  members: Array<{
    id: string;
    invitedEmail: string;
    inviteStatus: string;
    user?: { id?: string; fullName?: string; email?: string; department?: string; profileJson?: Record<string, unknown> } | null;
  }>;
  leader?: { fullName: string; email: string };
  problemStatement?: {
    id: string;
    code: string;
    title: string;
    theme: string;
    category: string;
    organisation: string;
    description: string;
  } | null;
  mentorAssignments?: Array<{
    id: string;
    mentorUserId: string;
    mentorType: string;
    mentor: { id: string; fullName: string; email: string; platformRole: string };
  }>;
  mentorInvites?: Array<{
    id: string;
    invitedEmail: string;
    mentorType: string;
    inviteStatus: string;
    mentor?: { id: string; fullName: string; email: string } | null;
  }>;
  ideaSubmissions?: Array<{
    id: string;
    status: string;
    abstract: string;
    techStack: string;
    feasibilityNotes: string;
    version: number;
    problemStatement?: { code: string; title: string; description: string; theme: string; organisation: string; category: string };
  }>;
  deliverables?: PortalDeliverable[];
  stageStatuses?: Array<{ status: string; stage: { id: string; name: string; sequence: number; deadline: string } }>;
  comments?: PortalComment[];
  stageResults?: Array<{
    weightedScore: string | number;
    rank?: number | null;
    published: boolean;
    stage: { name: string };
  }>;
};

export type PortalNotification = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  type: string;
};
