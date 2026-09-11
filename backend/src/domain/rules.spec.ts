import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canStudentViewResults,
  isPsCapReached,
  nextVersion,
  pickLeastLoadedMentor,
} from './rules';

describe('PS cap', () => {
  it('allows selection when under cap', () => {
    assert.equal(isPsCapReached(2, 8), false);
  });
  it('blocks when at cap', () => {
    assert.equal(isPsCapReached(8, 8), true);
  });
  it('allows unlimited when cap is null', () => {
    assert.equal(isPsCapReached(999, null), false);
  });
});

describe('evaluation publish gate', () => {
  it('hides unpublished scores from students', () => {
    assert.equal(canStudentViewResults(false), false);
  });
  it('allows published scores', () => {
    assert.equal(canStudentViewResults(true), true);
  });
});

describe('deliverable versions', () => {
  it('starts at 1 and increments', () => {
    assert.equal(nextVersion(undefined), 1);
    assert.equal(nextVersion(3), 4);
  });
});

describe('mentor auto-allocate', () => {
  it('prefers matching theme then lowest load', () => {
    const mentors = [
      { id: 'a', domainTags: ['HealthTech'] },
      { id: 'b', domainTags: ['HealthTech'] },
      { id: 'c', domainTags: ['AgriTech'] },
    ];
    const load = new Map([
      ['a', 4],
      ['b', 1],
      ['c', 0],
    ]);
    const picked = pickLeastLoadedMentor(mentors, load, 'HealthTech');
    assert.equal(picked?.id, 'b');
  });
});
