import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptedOthers,
  confirmationMatches,
  partitionLedTeams,
  selfDeleteBlockers,
  SOLE_ADMIN_BLOCKER,
  teamLeadBlocker,
} from './self-delete-rules';

const ME = 'me';
const accepted = (userId: string | null) => ({ userId, inviteStatus: 'accepted' });
const pending = (userId: string | null) => ({ userId, inviteStatus: 'pending' });

describe('acceptedOthers', () => {
  it('counts only accepted teammates other than the lead', () => {
    const members = [accepted(ME), accepted('a'), accepted('b'), pending('c'), accepted(null)];
    assert.equal(acceptedOthers(members, ME), 2);
  });

  it('treats a team of one accepted member as having no teammates', () => {
    assert.equal(acceptedOthers([accepted(ME)], ME), 0);
  });

  it('ignores a pending invite, so an unaccepted invite does not block a lead', () => {
    assert.equal(acceptedOthers([accepted(ME), pending('a')], ME), 0);
  });
});

describe('partitionLedTeams', () => {
  it('splits solo teams (deletable) from multi-member teams (blocking)', () => {
    const solo = { id: 't1', name: 'Solo', members: [accepted(ME)] };
    const busy = { id: 't2', name: 'Busy', members: [accepted(ME), accepted('a')] };
    const { solo: s, blocking: b } = partitionLedTeams([solo, busy], ME);
    assert.deepEqual(s.map((t) => t.id), ['t1']);
    assert.deepEqual(b.map((t) => t.id), ['t2']);
  });

  it('handles no led teams', () => {
    assert.deepEqual(partitionLedTeams([], ME), { solo: [], blocking: [] });
  });
});

describe('selfDeleteBlockers', () => {
  it('blocks the only active admin', () => {
    const blockers = selfDeleteBlockers({
      isAdmin: true,
      otherActiveAdmins: 0,
      ledTeams: [],
      selfId: ME,
    });
    assert.deepEqual(blockers, [SOLE_ADMIN_BLOCKER]);
  });

  it('allows an admin to self-delete when another admin exists', () => {
    assert.deepEqual(
      selfDeleteBlockers({ isAdmin: true, otherActiveAdmins: 1, ledTeams: [], selfId: ME }),
      [],
    );
  });

  it('never applies the admin rule to a non-admin', () => {
    assert.deepEqual(
      selfDeleteBlockers({ isAdmin: false, otherActiveAdmins: 0, ledTeams: [], selfId: ME }),
      [],
    );
  });

  it('treats an omitted admin count as sole-admin for an actual admin', () => {
    assert.deepEqual(selfDeleteBlockers({ isAdmin: true, ledTeams: [], selfId: ME }), [SOLE_ADMIN_BLOCKER]);
  });

  it('blocks a Team Lead of a multi-member team', () => {
    const blockers = selfDeleteBlockers({
      isAdmin: false,
      otherActiveAdmins: 1,
      ledTeams: [{ id: 't1', name: 'Team One', members: [accepted(ME), accepted('a')] }],
      selfId: ME,
    });
    assert.deepEqual(blockers, [teamLeadBlocker('Team One')]);
  });

  it('allows a Team Lead of a solo team through', () => {
    assert.deepEqual(
      selfDeleteBlockers({
        isAdmin: false,
        otherActiveAdmins: 1,
        ledTeams: [{ id: 't1', name: 'Solo', members: [accepted(ME)] }],
        selfId: ME,
      }),
      [],
    );
  });

  it('reports the admin blocker first, then each blocking team', () => {
    const blockers = selfDeleteBlockers({
      isAdmin: true,
      otherActiveAdmins: 0,
      ledTeams: [
        { id: 't1', name: 'Busy One', members: [accepted(ME), accepted('a')] },
        { id: 't2', name: 'Busy Two', members: [accepted(ME), accepted('b')] },
      ],
      selfId: ME,
    });
    assert.equal(blockers.length, 3);
    assert.equal(blockers[0], SOLE_ADMIN_BLOCKER);
    assert.deepEqual(blockers.slice(1), [teamLeadBlocker('Busy One'), teamLeadBlocker('Busy Two')]);
  });
});

describe('confirmationMatches', () => {
  it('accepts the literal word DELETE in any case, trimmed', () => {
    for (const v of ['DELETE', 'delete', '  Delete  ', '\tdELETE\n']) {
      assert.equal(confirmationMatches(v, 'me@x.com'), true, `expected ${JSON.stringify(v)} to match`);
    }
  });

  it('accepts the user own email, case-insensitively', () => {
    assert.equal(confirmationMatches('ME@X.com', 'me@x.com'), true);
    assert.equal(confirmationMatches('  me@x.com  ', 'Me@X.com'), true);
  });

  it('rejects anything else, including a near miss', () => {
    for (const v of ['', ' ', 'deletes', 'DELETED', 'delete my account', 'other@x.com', 'me@x.co']) {
      assert.equal(confirmationMatches(v, 'me@x.com'), false, `expected ${JSON.stringify(v)} to be rejected`);
    }
  });
});