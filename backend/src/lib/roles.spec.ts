import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PlatformRole } from '@prisma/client';
import { allRoles, hasAnyRole, hasRole, isDualMentor, unionAdditionalRoles } from './roles';

describe('dual-mentor role helpers', () => {
  it('allRoles returns primary first for single-role users', () => {
    assert.deepEqual(allRoles({ platformRole: PlatformRole.student }), [PlatformRole.student]);
  });

  it('allRoles merges primary + secondary without duplicating', () => {
    const held = allRoles({
      platformRole: PlatformRole.industry_mentor,
      additionalRoles: [PlatformRole.institute_mentor, PlatformRole.industry_mentor],
    });
    assert.deepEqual(held, [PlatformRole.industry_mentor, PlatformRole.institute_mentor]);
  });

  it('isDualMentor is true only when both mentor roles are held', () => {
    assert.equal(
      isDualMentor({
        platformRole: PlatformRole.institute_mentor,
        additionalRoles: [PlatformRole.industry_mentor],
      }),
      true,
    );
    assert.equal(isDualMentor({ platformRole: PlatformRole.institute_mentor }), false);
    assert.equal(isDualMentor({ platformRole: PlatformRole.admin }), false);
  });

  it('unionAdditionalRoles never duplicates the primary', () => {
    assert.deepEqual(
      unionAdditionalRoles({ platformRole: PlatformRole.institute_mentor }, PlatformRole.institute_mentor),
      [],
    );
    assert.deepEqual(
      unionAdditionalRoles({ platformRole: PlatformRole.institute_mentor }, PlatformRole.industry_mentor),
      [PlatformRole.industry_mentor],
    );
    // Idempotent second grant.
    assert.deepEqual(
      unionAdditionalRoles(
        { platformRole: PlatformRole.institute_mentor, additionalRoles: [PlatformRole.industry_mentor] },
        PlatformRole.industry_mentor,
      ),
      [PlatformRole.industry_mentor],
    );
  });

  it('guards match on secondary roles', () => {
    const dual = {
      platformRole: PlatformRole.industry_mentor,
      additionalRoles: [PlatformRole.institute_mentor],
    };
    assert.equal(hasRole(dual, PlatformRole.institute_mentor), true);
    assert.equal(hasAnyRole(dual, [PlatformRole.admin]), false);
  });
});
