import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PlatformRole } from '@prisma/client';
import {
  DECLINE_COOLDOWN_MS,
  DELETED_PREVIEW,
  chatRoleOf,
  clampLimit,
  cleanList,
  decideFriendRequest,
  decodeCursor,
  encodeCursor,
  isChatEligible,
  normalizeMessageBody,
  pairKey,
  parseSearchQuery,
  previewText,
  roleLabel,
  safeAvatarUrl,
  safeHttpUrl,
  safeProfileFromJson,
} from './chat-rules';

describe('pairKey', () => {
  it('is symmetric and canonical', () => {
    assert.equal(pairKey('b', 'a'), 'a:b');
    assert.equal(pairKey('a', 'b'), pairKey('b', 'a'));
  });
  it('handles equal ids', () => {
    assert.equal(pairKey('x', 'x'), 'x:x');
  });
});

describe('eligibility', () => {
  it('admin-only is excluded', () => {
    assert.equal(isChatEligible({ platformRole: PlatformRole.admin }), false);
    assert.equal(chatRoleOf({ platformRole: PlatformRole.admin }), null);
  });
  it('admin with an additional mentor role is eligible and labelled by that role', () => {
    const u = { platformRole: PlatformRole.admin, additionalRoles: [PlatformRole.industry_mentor] };
    assert.equal(isChatEligible(u), true);
    assert.equal(roleLabel(chatRoleOf(u)), 'Industry Mentor');
  });
  it('inactive users are excluded', () => {
    assert.equal(isChatEligible({ platformRole: PlatformRole.student, isActive: false }), false);
  });
  it('labels all four roles', () => {
    assert.equal(roleLabel(PlatformRole.student), 'Student');
    assert.equal(roleLabel(PlatformRole.institute_mentor), 'Institute Mentor');
    assert.equal(roleLabel(PlatformRole.student_expert), 'Student Expert');
  });
});

describe('normalizeMessageBody', () => {
  it('trims and accepts normal text', () => {
    assert.deepEqual(normalizeMessageBody('  hi  '), { ok: true, body: 'hi' });
  });
  it('rejects empty, whitespace and non-strings', () => {
    assert.equal(normalizeMessageBody('   \n ').ok, false);
    assert.equal(normalizeMessageBody(undefined).ok, false);
    assert.equal(normalizeMessageBody(5).ok, false);
  });
  it('enforces 2000 chars after trimming', () => {
    assert.equal(normalizeMessageBody('a'.repeat(2000)).ok, true);
    assert.equal(normalizeMessageBody(` ${'a'.repeat(2000)} `).ok, true);
    assert.equal(normalizeMessageBody('a'.repeat(2001)).ok, false);
  });
  it('normalizes CRLF and strips control chars but keeps newlines', () => {
    assert.deepEqual(normalizeMessageBody('a\r\nb\u0000c'), { ok: true, body: 'a\nbc' });
  });
});

describe('parseSearchQuery', () => {
  it('requires 2 chars', () => {
    assert.equal(parseSearchQuery('a').ok, false);
    assert.equal(parseSearchQuery(' a ').ok, false);
    assert.equal(parseSearchQuery(undefined).ok, false);
    assert.deepEqual(parseSearchQuery('  Ab  '), { ok: true, mode: 'text', value: 'Ab' });
  });
  it('treats @ as exact-email mode, lowercased', () => {
    assert.deepEqual(parseSearchQuery('Foo@Bar.com'), { ok: true, mode: 'email', value: 'foo@bar.com' });
  });
  it('rejects overly long input', () => {
    assert.equal(parseSearchQuery('a'.repeat(101)).ok, false);
  });
});

describe('decideFriendRequest', () => {
  const now = new Date('2026-10-06T12:00:00Z');
  it('rejects self', () => {
    const d = decideFriendRequest({ actorId: 'a', targetId: 'a', existing: null });
    assert.equal(d.action, 'reject');
  });
  it('creates when nothing exists', () => {
    assert.deepEqual(decideFriendRequest({ actorId: 'a', targetId: 'b', existing: null }), { action: 'create' });
  });
  it('409 when already friends', () => {
    const d = decideFriendRequest({ actorId: 'a', targetId: 'b', existing: { requesterId: 'b', status: 'accepted' } });
    assert.equal(d.action === 'reject' && d.httpStatus, 409);
  });
  it('is idempotent for my own pending request', () => {
    assert.deepEqual(
      decideFriendRequest({ actorId: 'a', targetId: 'b', existing: { requesterId: 'a', status: 'pending' } }),
      { action: 'noop' },
    );
  });
  it('auto-accepts when they already asked me', () => {
    assert.deepEqual(
      decideFriendRequest({ actorId: 'a', targetId: 'b', existing: { requesterId: 'b', status: 'pending' } }),
      { action: 'auto_accept' },
    );
  });
  it('blocks a declined requester for 24h then allows', () => {
    const respondedAt = new Date(now.getTime() - 60 * 60 * 1000);
    const existing = { requesterId: 'a', status: 'declined' as const, respondedAt };
    const blocked = decideFriendRequest({ actorId: 'a', targetId: 'b', existing, now });
    assert.equal(blocked.action === 'reject' && blocked.httpStatus, 429);
    const later = new Date(respondedAt.getTime() + DECLINE_COOLDOWN_MS);
    assert.deepEqual(decideFriendRequest({ actorId: 'a', targetId: 'b', existing, now: later }), {
      action: 'recreate',
    });
  });
  it('lets the person who declined send a request immediately', () => {
    const respondedAt = new Date(now.getTime() - 1000);
    assert.deepEqual(
      decideFriendRequest({
        actorId: 'b',
        targetId: 'a',
        existing: { requesterId: 'a', status: 'declined', respondedAt },
        now,
      }),
      { action: 'recreate' },
    );
  });
  it('declined without respondedAt is not blocked', () => {
    assert.deepEqual(
      decideFriendRequest({ actorId: 'a', targetId: 'b', existing: { requesterId: 'a', status: 'declined' }, now }),
      { action: 'recreate' },
    );
  });
});

describe('previewText', () => {
  it('returns short text untouched and collapses whitespace', () => {
    assert.equal(previewText('hello\n  world'), 'hello world');
  });
  it('truncates to at most 120 chars with an ellipsis', () => {
    const p = previewText('x'.repeat(500));
    assert.equal(p.length, 120);
    assert.ok(p.endsWith('…'));
    assert.equal(previewText('y'.repeat(120)).length, 120);
  });
  it('masks deleted messages', () => {
    assert.equal(previewText('secret', true), DELETED_PREVIEW);
  });
});

describe('misc helpers', () => {
  it('clampLimit', () => {
    assert.equal(clampLimit(undefined, 20, 50), 20);
    assert.equal(clampLimit('0', 20, 50), 20);
    assert.equal(clampLimit('500', 20, 50), 50);
    assert.equal(clampLimit('7', 20, 50), 7);
  });
  it('cursor roundtrip and garbage', () => {
    const c = { n: 'Zoe Unal', i: 'id-1' };
    assert.deepEqual(decodeCursor(encodeCursor(c)), c);
    assert.equal(decodeCursor('not-a-cursor'), null);
    assert.equal(decodeCursor(undefined), null);
  });
  it('safeHttpUrl only allows http(s)', () => {
    assert.equal(safeHttpUrl('javascript:alert(1)'), null);
    assert.equal(safeHttpUrl('https://linkedin.com/in/x'), 'https://linkedin.com/in/x');
  });
  it('cleanList dedupes, caps and accepts {name}', () => {
    assert.deepEqual(cleanList([{ name: 'React' }, 'react', 'Go', 5, ' '], 5, 40), ['React', 'Go']);
    assert.equal(cleanList(['a', 'b', 'c'], 2, 10).length, 2);
  });
  it('safeProfileFromJson never leaks contacts', () => {
    const p = safeProfileFromJson({
      bio: 'Hi',
      contacts: { phone: '999', email: 'x@y.z' },
      skills: { primary: [{ name: 'Rust' }], secondary: ['SQL'], tracks: ['AI'] },
      role: 'Leader',
    });
    assert.deepEqual(p, { headline: 'Leader', bio: 'Hi', skills: ['Rust', 'SQL'], tracks: ['AI'] });
    assert.ok(!JSON.stringify(p).includes('999'));
    assert.deepEqual(safeProfileFromJson(null).skills, []);
  });
  it('safeAvatarUrl rejects oversized or odd schemes', () => {
    assert.equal(safeAvatarUrl({ avatarUrl: 'https://x/y.png' }), 'https://x/y.png');
    assert.equal(safeAvatarUrl({ avatarUrl: 'javascript:1' }), null);
    const big = `data:image/png;base64,${'A'.repeat(5000)}`;
    assert.equal(safeAvatarUrl({ avatarUrl: big }), null);
    assert.ok(safeAvatarUrl({ avatarUrl: big }, 10_000));
  });
});
