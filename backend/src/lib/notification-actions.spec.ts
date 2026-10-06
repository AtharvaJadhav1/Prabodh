import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  friendActionState,
  inviteActionState,
  isActionKind,
  joinRequestActionState,
  normalizeAction,
  parseDecision,
  rolesAllowedFor,
  stateForDecision,
} from './notification-actions';

test('isActionKind accepts only known kinds', () => {
  for (const k of ['team_invite', 'mentor_invite', 'friend_request', 'join_request']) assert.equal(isActionKind(k), true);
  for (const k of ['', 'other', null, undefined, 3]) assert.equal(isActionKind(k), false);
});

test('normalizeAction validates kind and ref', () => {
  assert.deepEqual(normalizeAction({ kind: 'team_invite', ref: ' abc ' }), { kind: 'team_invite', ref: 'abc' });
  assert.equal(normalizeAction({ kind: 'nope', ref: 'x' }), null);
  assert.equal(normalizeAction({ kind: 'team_invite', ref: '  ' }), null);
  assert.equal(normalizeAction(undefined), null);
});

test('parseDecision / stateForDecision', () => {
  assert.equal(parseDecision('accept'), 'accept');
  assert.equal(parseDecision('decline'), 'decline');
  assert.equal(parseDecision('ACCEPT'), null);
  assert.equal(parseDecision(undefined), null);
  assert.equal(stateForDecision('accept'), 'accepted');
  assert.equal(stateForDecision('decline'), 'declined');
});

test('inviteActionState maps invite statuses', () => {
  assert.equal(inviteActionState('pending'), 'pending');
  assert.equal(inviteActionState('accepted'), 'accepted');
  assert.equal(inviteActionState('revoked'), 'declined');
  assert.equal(inviteActionState('expired'), 'expired');
  assert.equal(inviteActionState(null), 'expired');
  assert.equal(inviteActionState('pending', { frozen: true }), 'expired');
  assert.equal(inviteActionState('accepted', { frozen: true }), 'accepted');
});

test('joinRequestActionState maps join statuses', () => {
  assert.equal(joinRequestActionState('pending'), 'pending');
  assert.equal(joinRequestActionState('accepted'), 'accepted');
  assert.equal(joinRequestActionState('rejected'), 'declined');
  assert.equal(joinRequestActionState(undefined), 'expired');
  assert.equal(joinRequestActionState('pending', { frozen: true }), 'expired');
});

test('friendActionState maps friendship statuses', () => {
  assert.equal(friendActionState('pending'), 'pending');
  assert.equal(friendActionState('accepted'), 'accepted');
  assert.equal(friendActionState('declined'), 'declined');
  assert.equal(friendActionState(null), 'expired');
});

test('rolesAllowedFor mirrors endpoint role gates', () => {
  assert.deepEqual(rolesAllowedFor('team_invite'), ['student']);
  assert.equal(rolesAllowedFor('friend_request'), null);
  assert.equal(rolesAllowedFor('mentor_invite')?.includes('admin' as never), true);
});
