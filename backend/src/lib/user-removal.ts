import { Prisma } from '@prisma/client';
import { syncTeamMentorPointers } from './mentor-pointers';

type Tx = Prisma.TransactionClient;

/**
 * Relational cleanup shared by the two account-removal entry points
 * (`AdminService.removeUser` and `IdentityService.deleteOwnAccount`), so both walk the same
 * set of tables in the same order. Extracted rather than duplicated because a divergence
 * between the admin path and the self-service path would silently orphan rows on whichever
 * one is less used.
 */

/** Delete whole teams and everything hanging off them. Must run before the team's members are detached. */
export async function deleteTeams(tx: Tx, teamIds: string[]) {
  const assignments = await tx.mentorAssignment.findMany({
    where: { teamId: { in: teamIds } },
    select: { id: true },
  });
  const assignmentIds = assignments.map((a) => a.id);
  if (assignmentIds.length > 0) {
    await tx.mentorAssignment.updateMany({
      where: { reassignedFromId: { in: assignmentIds } },
      data: { reassignedFromId: null },
    });
  }
  const psRows = await tx.team.findMany({
    where: { id: { in: teamIds }, psId: { not: null } },
    select: { psId: true },
  });
  await tx.comment.updateMany({
    where: { teamId: { in: teamIds }, parentCommentId: { not: null } },
    data: { parentCommentId: null },
  });
  await tx.comment.deleteMany({ where: { teamId: { in: teamIds } } });
  await tx.deliverable.deleteMany({ where: { teamId: { in: teamIds } } });
  await tx.evaluation.updateMany({
    where: { supersededBy: { teamId: { in: teamIds } } },
    data: { supersededById: null },
  });
  await tx.evaluation.deleteMany({ where: { teamId: { in: teamIds } } });
  await tx.ideaSubmission.deleteMany({ where: { teamId: { in: teamIds } } });
  await tx.joinRequest.deleteMany({ where: { teamId: { in: teamIds } } });
  await tx.mentorAssignment.deleteMany({ where: { teamId: { in: teamIds } } });
  await tx.mentorInvite.deleteMany({ where: { teamId: { in: teamIds } } });
  await tx.stageResult.deleteMany({ where: { teamId: { in: teamIds } } });
  await tx.teamMember.deleteMany({ where: { teamId: { in: teamIds } } });
  await tx.teamPsPreference.deleteMany({ where: { teamId: { in: teamIds } } });
  await tx.teamStageStatus.deleteMany({ where: { teamId: { in: teamIds } } });
  await tx.team.deleteMany({ where: { id: { in: teamIds } } });
  // Group by psId and decrement once per distinct statement. Two deleted teams
  // can share a psId, so the per-team multiplicity has to be preserved —
  // de-duplicating to a Set here would silently under-count teamsSelectedCount.
  const decrements = new Map<string, number>();
  for (const row of psRows) {
    if (!row.psId) continue;
    decrements.set(row.psId, (decrements.get(row.psId) ?? 0) + 1);
  }
  for (const [psId, count] of decrements) {
    await tx.problemStatement.updateMany({
      where: { id: psId },
      data: { teamsSelectedCount: { decrement: count } },
    });
  }
}

/**
 * Detach one user from everything that references them, leaving the `user` row intact —
 * the caller decides whether to scrub it in place or delete it.
 *
 * `reassignMentorWorkTo` receives the mentor assignments the user created as an admin
 * (assignedById is NOT NULL, so those rows need a surviving owner). Team-lead succession is
 * NOT handled here: it differs per caller, since the admin path promotes a successor while
 * self-service blocks instead.
 *
 * Returns the ids of teams the user was mentoring, so the caller can notify their leads.
 */
export async function detachUserRelations(
  tx: Tx,
  target: { id: string; email: string; industrialMentorProfile?: { id: string } | null },
  opts: {
    reassignMentorWorkTo: string;
    /** Team ids already deleted by `deleteTeams`; their mentor pointers no longer need syncing. */
    skipMentorPointerSyncFor?: Iterable<string>;
  },
): Promise<{ mentoredTeamIds: string[] }> {
  const skipSync = new Set(opts.skipMentorPointerSyncFor ?? []);

  if (target.industrialMentorProfile) {
    const profileId = target.industrialMentorProfile.id;
    await tx.team.updateMany({
      where: { industrialMentorId: profileId },
      data: { industrialMentorId: null },
    });
    await tx.mentorAssignment.updateMany({
      where: { industrialMentorId: profileId },
      data: { industrialMentorId: null },
    });
    await tx.industrialMentor.delete({ where: { id: profileId } });
  }

  await tx.team.updateMany({ where: { facultyMentorId: target.id }, data: { facultyMentorId: null } });

  const targetAssignments = await tx.mentorAssignment.findMany({
    where: { mentorUserId: target.id },
    select: { id: true, teamId: true },
  });
  const targetAssignmentIds = targetAssignments.map((a) => a.id);
  if (targetAssignmentIds.length > 0) {
    await tx.mentorAssignment.updateMany({
      where: { reassignedFromId: { in: targetAssignmentIds } },
      data: { reassignedFromId: null },
    });
    await tx.mentorAssignment.deleteMany({ where: { id: { in: targetAssignmentIds } } });
  }
  const mentoredTeamIds = [...new Set(targetAssignments.map((a) => a.teamId))].filter(
    (id) => !skipSync.has(id),
  );
  for (const teamId of mentoredTeamIds) {
    await syncTeamMentorPointers(tx, teamId);
  }

  await tx.mentorAssignment.updateMany({
    where: { assignedById: target.id },
    data: { assignedById: opts.reassignMentorWorkTo },
  });
  await tx.mentorInvite.deleteMany({ where: { mentorUserId: target.id } });
  await tx.mentorInvite.deleteMany({ where: { invitedById: target.id } });
  // An invite addressed by email to someone who never linked an account is not matched by
  // mentorUserId, so it has to be cleared by address or it outlives the account.
  await tx.mentorInvite.deleteMany({ where: { invitedEmail: target.email } });

  await tx.ideaSubmission.updateMany({ where: { authorUserId: target.id }, data: { authorUserId: null } });
  await tx.teamPsPreference.updateMany({ where: { decidedById: target.id }, data: { decidedById: null } });
  await tx.teamPsPreference.deleteMany({ where: { submittedById: target.id } });
  await tx.notificationLog.updateMany({ where: { recipientUserId: target.id }, data: { recipientUserId: null } });
  await tx.stageResult.updateMany({ where: { publishedById: target.id }, data: { publishedById: null } });
  await tx.teamMember.deleteMany({ where: { userId: target.id } });
  await tx.joinRequest.deleteMany({ where: { studentId: target.id } });
  await tx.notification.deleteMany({ where: { userId: target.id } });
  await tx.broadcast.deleteMany({ where: { adminUserId: target.id } });

  const commentIds = await tx.comment.findMany({
    where: { authorUserId: target.id },
    select: { id: true },
  });
  if (commentIds.length > 0) {
    const ids = commentIds.map((c) => c.id);
    await tx.comment.updateMany({ where: { parentCommentId: { in: ids } }, data: { parentCommentId: null } });
    await tx.comment.deleteMany({ where: { id: { in: ids } } });
  }

  return { mentoredTeamIds };
}

/**
 * Break the supersede chain through a user's evaluations and delete them. Callers that
 * need to preserve evaluation history should skip this and scrub the user row instead.
 */
export async function deleteOwnEvaluations(tx: Tx, userId: string) {
  const targetEvals = await tx.evaluation.findMany({
    where: { evaluatorUserId: userId },
    select: { id: true },
  });
  if (targetEvals.length === 0) return 0;
  const ids = targetEvals.map((e) => e.id);
  await tx.evaluation.updateMany({ where: { supersededById: { in: ids } }, data: { supersededById: null } });
  await tx.evaluation.deleteMany({ where: { id: { in: ids } } });
  return ids.length;
}