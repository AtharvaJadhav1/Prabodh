import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PlatformRole } from '@prisma/client';
import { NON_TEAMMATE_ROLES, matchesEmailBlocklist, parseEmailBlocklist } from './mentor-emails';

describe('mentor email blocklist', () => {
  it('parses exact emails and domains from commas, spaces and new lines', () => {
    const list = parseEmailBlocklist('Neha@College.edu, arjun@x.org\n@mentors.college.edu;  *@faculty.edu ');
    assert.equal(list.emails.size, 2);
    assert.deepEqual(list.domains, ['@mentors.college.edu', '@faculty.edu']);
  });

  it('ignores blanks, bare words and an unset value', () => {
    assert.deepEqual(parseEmailBlocklist(undefined), { emails: new Set(), domains: [] });
    assert.deepEqual(parseEmailBlocklist('  ,  ;; justaword '), { emails: new Set(), domains: [] });
  });

  it('matches exact emails case-insensitively', () => {
    const list = parseEmailBlocklist('neha@college.edu');
    assert.equal(matchesEmailBlocklist('NEHA@College.edu', list), true);
    assert.equal(matchesEmailBlocklist('neha2@college.edu', list), false);
  });

  it('matches a whole domain but not look-alike domains', () => {
    const list = parseEmailBlocklist('@mentors.college.edu');
    assert.equal(matchesEmailBlocklist('anyone@mentors.college.edu', list), true);
    assert.equal(matchesEmailBlocklist('anyone@college.edu', list), false);
    // "evilmentors.college.edu" shares a suffix but is a different domain once the @ is required.
    assert.equal(matchesEmailBlocklist('anyone@evilmentors.college.edu', list), false);
  });
});

describe('roles that cannot be invited as teammates', () => {
  it('covers every mentor-type role and admin, and never students', () => {
    for (const role of [
      PlatformRole.institute_mentor,
      PlatformRole.industry_mentor,
      PlatformRole.student_expert,
      PlatformRole.admin,
    ]) {
      assert.equal(NON_TEAMMATE_ROLES.includes(role), true, role);
    }
    assert.equal(NON_TEAMMATE_ROLES.includes(PlatformRole.student), false);
  });
});
