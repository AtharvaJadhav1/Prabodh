import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MentorType, PlatformRole } from '@prisma/client';
import { allRoles, hasRole, isDualMentor } from './roles';
import {
  canFreezeTeam,
  isSelfInvite,
  mentorTypeForRole,
  nextMentorLockedAt,
  parseMentorTypeQuery,
  sameEmail,
  seatConflict,
} from './mentor-rules';

const DUAL_INSTITUTE_PRIMARY = {
  platformRole: PlatformRole.institute_mentor,
  additionalRoles: [PlatformRole.industry_mentor],
};
const DUAL_INDUSTRY_PRIMARY = {
  platformRole: PlatformRole.industry_mentor,
  additionalRoles: [PlatformRole.institute_mentor],
};

describe('dual mentor — workspace mapping', () => {
  it('maps each mentor role to its mentor type', () => {
    assert.equal(mentorTypeForRole(PlatformRole.institute_mentor), MentorType.institute);
    assert.equal(mentorTypeForRole(PlatformRole.industry_mentor), MentorType.industry);
    assert.equal(mentorTypeForRole(PlatformRole.admin), undefined);
    assert.equal(mentorTypeForRole(PlatformRole.student), undefined);
    assert.equal(mentorTypeForRole(null), undefined);
  });

  it('only accepts the two valid ?mentorType= values', () => {
    assert.equal(parseMentorTypeQuery('institute'), MentorType.institute);
    assert.equal(parseMentorTypeQuery('industry'), MentorType.industry);
    assert.equal(parseMentorTypeQuery('admin'), undefined);
    assert.equal(parseMentorTypeQuery(''), undefined);
    assert.equal(parseMentorTypeQuery(undefined), undefined);
  });
});

describe('dual mentor — role holding (either primary order)', () => {
  for (const [label, user] of [
    ['institute primary', DUAL_INSTITUTE_PRIMARY],
    ['industry primary', DUAL_INDUSTRY_PRIMARY],
  ] as const) {
    it(`${label}: holds both roles and is a dual mentor`, () => {
      assert.equal(isDualMentor(user), true);
      assert.equal(hasRole(user, PlatformRole.institute_mentor), true);
      assert.equal(hasRole(user, PlatformRole.industry_mentor), true);
      assert.equal(allRoles(user).length, 2);
      assert.equal(hasRole(user, PlatformRole.admin), false);
    });
  }

  it('a single-role industry mentor is not a dual mentor and cannot act as faculty', () => {
    const single = { platformRole: PlatformRole.industry_mentor, additionalRoles: [] };
    assert.equal(isDualMentor(single), false);
    assert.equal(hasRole(single, PlatformRole.institute_mentor), false);
  });
});

describe('dual mentor — one seat per team', () => {
  const faculty = { mentorUserId: 'dual', mentorType: MentorType.institute, active: true };
  const industrial = { mentorUserId: 'dual', mentorType: MentorType.industry, active: true };

  it('blocks the team faculty mentor from also becoming its industrial mentor', () => {
    assert.match(seatConflict([faculty], 'dual', MentorType.industry) ?? '', /already the faculty mentor/);
  });

  it('blocks the team industrial mentor from also becoming its faculty mentor', () => {
    assert.match(seatConflict([industrial], 'dual', MentorType.institute) ?? '', /already the industrial mentor/);
  });

  it('blocks a duplicate seat of the same type', () => {
    assert.match(seatConflict([faculty], 'dual', MentorType.institute) ?? '', /already assigned/);
  });

  it('allows a dual mentor on a team where they hold no seat', () => {
    assert.equal(seatConflict([], 'dual', MentorType.industry), null);
    assert.equal(seatConflict([{ ...faculty, mentorUserId: 'someone-else' }], 'dual', MentorType.industry), null);
  });

  it('ignores inactive (unassigned) seats, so a former faculty mentor can come back as industrial', () => {
    assert.equal(seatConflict([{ ...faculty, active: false }], 'dual', MentorType.industry), null);
  });
});

describe('dual mentor — self invites', () => {
  it('detects a mentor inviting their own account', () => {
    assert.equal(isSelfInvite('u1', 'u1'), true);
    assert.equal(isSelfInvite('u1', 'u2'), false);
  });
});

describe('admin override — role required for each seat', () => {
  it('institute seat needs institute_mentor, industry seat needs industry_mentor', async () => {
    const { mentorRoleFor } = await import('./mentor-rules');
    assert.equal(mentorRoleFor(MentorType.institute), PlatformRole.institute_mentor);
    assert.equal(mentorRoleFor(MentorType.industry), PlatformRole.industry_mentor);
  });

  it('a dual mentor qualifies for either seat, a single-role mentor only for their own', () => {
    assert.equal(hasRole(DUAL_INSTITUTE_PRIMARY, PlatformRole.industry_mentor), true);
    assert.equal(hasRole({ platformRole: PlatformRole.institute_mentor }, PlatformRole.industry_mentor), false);
  });

  it('replacing the current seat holder is not a conflict once that seat is excluded', () => {
    const seatBeingReplaced = { mentorUserId: 'dual', mentorType: MentorType.institute, active: true };
    // Without excluding it, the same-type seat would block; with it removed the list is empty.
    assert.notEqual(seatConflict([seatBeingReplaced], 'dual', MentorType.institute), null);
    assert.equal(seatConflict([], 'dual', MentorType.institute), null);
  });
});

describe('canFreezeTeam', () => {
  const seat = (mentorUserId: string, mentorType: MentorType, active = true) => ({ mentorUserId, mentorType, active });
  const user = (id: string, platformRole: PlatformRole, additionalRoles: PlatformRole[] = []) => ({
    id,
    platformRole,
    additionalRoles,
  });

  it('allows admins, including via additionalRoles', () => {
    assert.equal(canFreezeTeam(user('a', PlatformRole.admin), []), true);
    assert.equal(canFreezeTeam(user('a', PlatformRole.student, [PlatformRole.admin]), []), true);
  });
  it('allows only the active faculty mentor of that team', () => {
    const seats = [seat('f1', MentorType.institute)];
    assert.equal(canFreezeTeam(user('f1', PlatformRole.institute_mentor), seats), true);
    assert.equal(canFreezeTeam(user('f2', PlatformRole.institute_mentor), seats), false);
    assert.equal(canFreezeTeam(user('f1', PlatformRole.institute_mentor), [seat('f1', MentorType.institute, false)]), false);
  });
  it('rejects a dual-role user who is only the industry mentor', () => {
    const dual = user('d', PlatformRole.institute_mentor, [PlatformRole.industry_mentor]);
    assert.equal(canFreezeTeam(dual, [seat('d', MentorType.industry)]), false);
  });
});

describe('sameEmail / nextMentorLockedAt', () => {
  it('compares emails case-insensitively', () => {
    assert.equal(sameEmail('A@B.com', ' a@b.COM '), true);
    assert.equal(sameEmail('a@b.com', 'c@b.com'), false);
    assert.equal(sameEmail(null, 'a@b.com'), false);
  });
  it('keeps, sets and clears the faculty lock', () => {
    const now = new Date('2026-01-02');
    const before = new Date('2026-01-01');
    assert.equal(nextMentorLockedAt(true, before, now), before);
    assert.equal(nextMentorLockedAt(true, null, now), now);
    assert.equal(nextMentorLockedAt(false, before, now), null);
  });
});
