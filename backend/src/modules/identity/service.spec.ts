import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PlatformRole } from '@prisma/client';
import {
  buildIndustrialMentorData,
  parseCsvUsers,
  parseRole,
  studentStaffMixError,
} from './service';

describe('parseRole', () => {
  it('normalises aliases', () => {
    assert.equal(parseRole('Faculty Mentor'), PlatformRole.institute_mentor);
    assert.equal(parseRole('Industrial-Mentor'), PlatformRole.industry_mentor);
    assert.equal(parseRole(' ADMIN '), PlatformRole.admin);
  });
  it('rejects unknown roles', () => {
    assert.throws(() => parseRole('janitor'));
  });
});

describe('parseCsvUsers', () => {
  it('parses comma and semicolon CSV', () => {
    const rows = parseCsvUsers('email,name,role,company\na@x.com,A,industry,Acme\n');
    assert.deepEqual(rows, [
      { email: 'a@x.com', fullName: 'A', platformRole: PlatformRole.industry_mentor, institute: 'Acme', department: undefined },
    ]);
    assert.equal(parseCsvUsers('email;name;role\nb@x.com;B;student')[0].platformRole, PlatformRole.student);
  });
  it('rejects rows missing email or name', () => {
    assert.throws(() => parseCsvUsers('email,name,role\n,A,student'));
  });
});

describe('studentStaffMixError', () => {
  it('blocks student + staff in either direction', () => {
    assert.match(studentStaffMixError([PlatformRole.student], [PlatformRole.admin]) ?? "", /student/);
    assert.notEqual(studentStaffMixError([PlatformRole.admin], [PlatformRole.student]), null);
    assert.notEqual(studentStaffMixError([], [PlatformRole.student, PlatformRole.institute_mentor]), null);
  });
  it('allows pure student and mentor combos', () => {
    assert.equal(studentStaffMixError([], [PlatformRole.student]), null);
    assert.equal(
      studentStaffMixError([PlatformRole.institute_mentor], [PlatformRole.industry_mentor, PlatformRole.admin]),
      null,
    );
  });
});

describe('buildIndustrialMentorData', () => {
  it('omits empty values so updates never blank existing data', () => {
    assert.deepEqual(buildIndustrialMentorData({ fullName: 'A', companyName: '  ', designation: null, phone: undefined }), {
      fullName: 'A',
      isActive: true,
    });
  });
  it('includes provided values', () => {
    assert.deepEqual(buildIndustrialMentorData({ fullName: 'A', companyName: 'Acme', designation: 'CTO', phone: '1' }), {
      fullName: 'A',
      companyName: 'Acme',
      designation: 'CTO',
      phone: '1',
      isActive: true,
    });
  });
});
