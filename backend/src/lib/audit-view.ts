import { PlatformRole, Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export const CATEGORY_ACTIONS: Record<string, string[]> = {
  team_formation: ['team.created', 'team.renamed', 'team.lock', 'team.disqualify', 'team.invite', 'team.join'],
  mentor_allocation: ['mentor.allocate', 'mentor.unassign'],
  mentor_override: ['mentor.reassign'],
  industry_invites: ['mentor.invite', 'mentor.invite_accepted', 'mentor.assign_industry'],
  milestone_reviews: ['evaluation.submitted', 'evaluation.publish'],
  user_administration: ['user.remove'],
};

export type AuditRow = {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: Prisma.JsonValue | null;
  after: Prisma.JsonValue | null;
  createdAt: Date;
  actor: { id: string; email: string; fullName: string; platformRole: PlatformRole } | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function strOf(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined;
}

function numOf(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** Read an array of plain objects out of a JSON payload field. */
function recListOf(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? v.filter((it): it is Record<string, unknown> => !!it && typeof it === 'object') : [];
}

const ROLE_LABELS: Record<string, string> = {
  student: 'student',
  admin: 'admin',
  institute_mentor: 'institute mentor',
  industry_mentor: 'industry mentor',
  student_expert: 'student expert',
};

function roleLabel(role?: string | null): string {
  if (!role) return '';
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ');
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function humanizeAction(action: string): string {
  return action
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w ? capitalize(w) : w))
    .join(' ');
}

export async function enrichAuditRows(prisma: PrismaService, rows: AuditRow[]) {
  const teamIds = new Set<string>();
  const assignmentIds = new Set<string>();
  const stageIds = new Set<string>();
  const broadcastIds = new Set<string>();
  const userIds = new Set<string>();

  for (const it of rows) {
    const after = asRecord(it.after);
    const before = asRecord(it.before);
    if (it.entityType === 'team') teamIds.add(it.entityId);
    if (it.entityType === 'mentor_assignment') assignmentIds.add(it.entityId);
    if (it.entityType === 'stage') stageIds.add(it.entityId);
    if (it.entityType === 'broadcast') broadcastIds.add(it.entityId);
    const tid = strOf(after?.teamId);
    if (tid) teamIds.add(tid);
    const sid = strOf(after?.stageId);
    if (sid) stageIds.add(sid);
    const mid = strOf(after?.mentorUserId);
    if (mid) userIds.add(mid);
    const oldMid = strOf(before?.mentorUserId);
    if (oldMid) userIds.add(oldMid);
  }

  const [teams, assignments, stages, broadcasts, users] = await Promise.all([
    prisma.team.findMany({ where: { id: { in: [...teamIds] } }, select: { id: true, name: true, teamCode: true } }),
    prisma.mentorAssignment.findMany({
      where: { id: { in: [...assignmentIds] } },
      select: { id: true, mentorType: true, team: { select: { id: true, name: true, teamCode: true } } },
    }),
    prisma.stage.findMany({ where: { id: { in: [...stageIds] } }, select: { id: true, name: true } }),
    prisma.broadcast.findMany({ where: { id: { in: [...broadcastIds] } }, select: { id: true, title: true } }),
    prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, fullName: true } }),
  ]);

  const teamsBy = new Map(teams.map((t) => [t.id, t]));
  const assignmentsBy = new Map(assignments.map((a) => [a.id, a]));
  const stagesBy = new Map(stages.map((s) => [s.id, s.name]));
  const broadcastsBy = new Map(broadcasts.map((b) => [b.id, b.title]));
  const usersBy = new Map(users.map((u) => [u.id, u.fullName]));

  return rows.map((it) => {
    const after = asRecord(it.after);
    const before = asRecord(it.before);
    const assignment = assignmentsBy.get(it.entityId) ?? null;
    const team =
      teamsBy.get(it.entityId) ??
      assignment?.team ??
      (after?.teamId ? teamsBy.get(String(after.teamId)) : undefined) ??
      null;
    const afterStageId = strOf(after?.stageId);
    const stageName = afterStageId ? stagesBy.get(afterStageId) ?? null : null;

    // Removal rows must describe a user that no longer exists, so the label is
    // rebuilt from the stored snapshot. A live lookup would return nothing for
    // these rows and fall through to a dash. Scoped to `user` entities so team
    // and stage rows keep using their live-resolved name/code.
    const targetName = strOf(before?.fullName);
    const targetEmail = strOf(after?.targetEmail) ?? strOf(before?.email);
    const targetLabel =
      it.entityType === 'user'
        ? (targetName && targetEmail
            ? `${targetName} (${targetEmail})`
            : (targetName ?? targetEmail ?? it.entityId))
        : null;
    const targetMeta = roleLabel(strOf(before?.platformRole)) || null;

    const summary = summarizeAudit({
      action: it.action,
      entityType: it.entityType,
      before,
      after,
      team: team ?? null,
      assignment,
      stageName,
      broadcastTitle: broadcastsBy.get(it.entityId) ?? null,
      usersBy,
    });

    return {
      id: it.id,
      actorUserId: it.actorUserId,
      action: it.action,
      entityType: it.entityType,
      entityId: it.entityId,
      before: it.before,
      after: it.after,
      createdAt: it.createdAt,
      actor: it.actor,
      actorName: it.actor?.fullName ?? it.actorName,
      actorEmail: it.actor?.email ?? it.actorEmail,
      actorRole: it.actor?.platformRole ?? it.actorRole,
      teamName: team?.name ?? null,
      teamCode: team?.teamCode ?? null,
      targetLabel,
      targetMeta,
      summary,
    };
  });
}

type SummaryInput = {
  action: string;
  entityType: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  team: { name: string; teamCode: string } | null;
  assignment: { mentorType: string } | null;
  stageName: string | null;
  broadcastTitle: string | null;
  usersBy: Map<string, string>;
};

function summarizeAudit(input: SummaryInput): string {
  const { action, before, after, team, assignment, stageName, broadcastTitle, usersBy } = input;
  const teamLabel = team ? `${team.name} (${team.teamCode})` : null;
  const mentorTypeLabel = (t: unknown) =>
    t === 'industry' ? 'Industry' : t === 'institute' ? 'Institute' : t ? String(t) : 'Mentor';
  const nameOf = (v: unknown) => (typeof v === 'string' ? usersBy.get(v) : undefined);

  switch (action) {
    case 'team.created':
      return `Registered team "${String(after?.name ?? '')}"${team ? ` (${team.teamCode})` : ''}`;
    case 'team.renamed': {
      const from = String(before?.name ?? '');
      const to = String(after?.name ?? '');
      return from && to ? `Renamed team from "${from}" to "${to}"` : 'Updated team details';
    }
    case 'team.lock':
      return teamLabel ? `Locked team details for ${teamLabel}` : 'Locked team details';
    case 'team.disqualify':
      return teamLabel ? `Disqualified team ${teamLabel}` : 'Disqualified a team';
    case 'team.invite':
      return `Invited ${String(after?.invitedEmail ?? 'a student')} to join ${teamLabel ?? 'the team'}`;
    case 'team.join': {
      const who = String(after?.memberName ?? after?.memberEmail ?? 'A student');
      return `${who} joined ${teamLabel ?? 'the team'}`;
    }
    case 'mentor.allocate': {
      const mentorName = nameOf(after?.mentorUserId) ?? 'a mentor';
      const type = mentorTypeLabel(after?.mentorType ?? assignment?.mentorType);
      const method = after?.assignmentMethod === 'auto_rule' ? ' (auto)' : '';
      return `Assigned ${mentorName} as ${type} mentor to ${teamLabel ?? 'a team'}${method}`;
    }
    case 'mentor.reassign': {
      const nextName = nameOf(after?.mentorUserId) ?? 'a mentor';
      const prevName = nameOf(before?.mentorUserId) ?? 'a previous mentor';
      const type = mentorTypeLabel(assignment?.mentorType ?? after?.mentorType);
      return `Reassigned ${nextName} as ${type} mentor, replacing ${prevName}, for ${teamLabel ?? 'the team'}`;
    }
    case 'mentor.unassign': {
      const mentorName = nameOf(before?.mentorUserId) ?? 'a mentor';
      const type = mentorTypeLabel(before?.mentorType ?? assignment?.mentorType);
      const teamText = teamLabel ?? (before?.teamName ? String(before.teamName) : 'a team');
      return `Unassigned ${mentorName} (${type} mentor) from ${teamText}`;
    }
    case 'mentor.assign_industry': {
      const mentorName = nameOf(after?.mentorUserId) ?? 'an industry mentor';
      return `Assigned industry mentor ${mentorName} to ${teamLabel ?? 'a team'}`;
    }
    case 'mentor.invite': {
      const type = mentorTypeLabel(after?.mentorType);
      return `Invited ${String(after?.invitedEmail ?? 'a mentor')} as ${type} mentor for ${teamLabel ?? 'a team'}`;
    }
    case 'mentor.invite_accepted': {
      const type = mentorTypeLabel(after?.mentorType ?? assignment?.mentorType);
      return teamLabel ? `Accepted ${type} mentor invite and bound to ${teamLabel}` : `Accepted a ${type} mentor invite`;
    }
    case 'evaluation.submitted': {
      const stage = stageName ? ` for ${stageName}` : '';
      const score = after?.score != null ? ` (${after.score})` : '';
      return `Submitted evaluation${score}${stage} on ${teamLabel ?? 'a team'}`;
    }
    case 'evaluation.publish': {
      const count = typeof after?.count === 'number' ? ` (${after.count} team${after.count === 1 ? '' : 's'})` : '';
      return `Published stage results${stageName ? ` for ${stageName}` : ''}${count}`;
    }
    case 'broadcast.send': {
      const count = typeof after?.recipientCount === 'number' ? ` to ${after.recipientCount} recipient(s)` : '';
      const title = broadcastTitle ? ` "${broadcastTitle}"` : '';
      return `Sent broadcast${title}${count}`;
    }
    case 'user.remove': {
      // The target user no longer exists, so everything renders from the snapshot.
      const role = roleLabel(strOf(before?.platformRole));
      const name = strOf(before?.fullName);
      const email = strOf(after?.targetEmail) ?? strOf(before?.email);
      const who = [role, name ?? email].filter(Boolean).join(' ') || 'a user';
      const subject = name && email ? `${who} (${email})` : who;

      const impact = asRecord(after?.impact);
      const deleted = recListOf(impact?.deletedTeams);
      const promoted = recListOf(impact?.promotedTeams);
      // Rows written before the impact block only stored flat name arrays.
      const legacyNames = (key: 'deletedTeams' | 'promotedTeams') =>
        (Array.isArray(after?.[key]) ? (after?.[key] as unknown[]) : [])
          .map(strOf)
          .filter((n): n is string => !!n);

      const sentences: string[] = [];
      if (deleted.length > 0) {
        // Each team already carries its own count, so no separate total is added.
        const listed = deleted
          .map((d) => {
            const nm = strOf(d.teamName) ?? strOf(d.deletedTeamId) ?? 'a team';
            const n = numOf(d.membersAffected) ?? 0;
            return `'${nm}'${n ? ` (${n} member${n === 1 ? '' : 's'})` : ''}`;
          })
          .join(', ');
        sentences.push(`Cascaded deletion: deleted ${deleted.length === 1 ? 'team' : 'teams'} ${listed}.`);
      } else {
        const legacy = legacyNames('deletedTeams');
        if (legacy.length > 0) {
          sentences.push(
            `Cascaded deletion: deleted ${legacy.length === 1 ? 'team' : 'teams'} ${legacy.map((n) => `'${n}'`).join(', ')}.`,
          );
        }
      }
      if (promoted.length > 0) {
        for (const p of promoted) {
          sentences.push(`Promoted a new leader for team '${strOf(p.teamName) ?? strOf(p.teamId) ?? 'a team'}'.`);
        }
      } else {
        const legacy = legacyNames('promotedTeams');
        if (legacy.length > 0) {
          for (const n of legacy) sentences.push(`Promoted a new leader for team '${n}'.`);
        }
      }
      return `Removed ${subject}.${sentences.length ? ` ${sentences.join(' ')}` : ''}`;
    }
    default:
      return humanizeAction(action);
  }
}
