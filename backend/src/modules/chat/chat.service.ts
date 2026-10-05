import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendshipStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../../common/auth.types';
import {
  CHAT_ROLES,
  CLIENT_ID_MAX_LENGTH,
  chatRoleOf,
  clampLimit,
  cleanList,
  cleanText,
  decideFriendRequest,
  decodeCursor,
  encodeCursor,
  normalizeMessageBody,
  pairKey,
  parseSearchQuery,
  previewText,
  roleLabel,
  safeAvatarUrl,
  safeHttpUrl,
  safeProfileFromJson,
} from '../../lib/chat-rules';
import { createNotifications } from '../../lib/notify';
import { PrismaService } from '../../lib/prisma.service';
import { consumeToken } from '../../lib/rate-limit';
import { TeamsService } from '../teams/service';

/** Group threads with no read marker count comments from the last 30 days as unread. */
const GROUP_UNREAD_FALLBACK_DAYS = 30;
const MAX_CONVERSATIONS = 200;
/** Inline (data:) avatars above this size are dropped from list payloads. */
const LIST_AVATAR_MAX_CHARS = 30_000;
/** The single-person profile view may include larger inline avatars. */
const DETAIL_AVATAR_MAX_CHARS = 2_000_000;

const PERSON_SELECT = {
  id: true,
  fullName: true,
  platformRole: true,
  additionalRoles: true,
  institute: true,
  department: true,
  profileJson: true,
} satisfies Prisma.UserSelect;

type PersonRow = Prisma.UserGetPayload<{ select: typeof PERSON_SELECT }>;
type FriendshipInfo = { status: 'none' | 'friends' | 'outgoing' | 'incoming'; requestId?: string };
type Person = {
  id: string;
  fullName: string;
  platformRole: string;
  roleLabel: string;
  institute: string | null;
  department: string | null;
  avatarUrl: string | null;
  friendship: FriendshipInfo;
};

const eligibleUserWhere: Prisma.UserWhereInput = {
  isActive: true,
  OR: [{ platformRole: { in: CHAT_ROLES } }, { additionalRoles: { hasSome: CHAT_ROLES } }],
};

type DmRow = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
  deletedAt: Date | null;
  clientId: string | null;
};

function toDm(m: DmRow) {
  const deleted = m.deletedAt !== null;
  return {
    id: m.id,
    senderId: m.senderId,
    recipientId: m.recipientId,
    body: deleted ? '' : m.body,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt ? m.readAt.toISOString() : null,
    deleted,
    clientId: m.clientId,
  };
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teams: TeamsService,
  ) {}

  /* ---------------- people ---------------- */

  private toPerson(row: PersonRow, friendship: FriendshipInfo, avatarMax = LIST_AVATAR_MAX_CHARS): Person {
    const role = chatRoleOf(row);
    return {
      id: row.id,
      fullName: row.fullName,
      platformRole: role ?? row.platformRole,
      roleLabel: roleLabel(role),
      institute: row.institute,
      department: row.department,
      avatarUrl: safeAvatarUrl(row.profileJson, avatarMax),
      friendship,
    };
  }

  private async friendshipMap(meId: string, otherIds: string[]) {
    const map = new Map<string, FriendshipInfo>();
    if (!otherIds.length) return map;
    const rows = await this.prisma.friendship.findMany({
      where: { pairKey: { in: otherIds.map((id) => pairKey(meId, id)) } },
      select: { id: true, requesterId: true, addresseeId: true, status: true },
    });
    for (const r of rows) {
      const other = r.requesterId === meId ? r.addresseeId : r.requesterId;
      if (r.status === FriendshipStatus.accepted) map.set(other, { status: 'friends', requestId: r.id });
      else if (r.status === FriendshipStatus.pending) {
        map.set(other, { status: r.requesterId === meId ? 'outgoing' : 'incoming', requestId: r.id });
      }
    }
    return map;
  }

  private async peopleFor(meId: string, rows: PersonRow[], avatarMax = LIST_AVATAR_MAX_CHARS) {
    const fm = await this.friendshipMap(
      meId,
      rows.map((r) => r.id),
    );
    return rows.map((r) => this.toPerson(r, fm.get(r.id) ?? { status: 'none' }, avatarMax));
  }

  async searchPeople(user: AuthUser, q?: string, limitRaw?: string, cursorRaw?: string) {
    const parsed = parseSearchQuery(q);
    if (!parsed.ok) throw new BadRequestException(parsed.error);
    const limit = clampLimit(limitRaw, 20, 50);
    const cursor = decodeCursor(cursorRaw);
    if (cursorRaw && !cursor) throw new BadRequestException('Invalid page cursor.');

    const and: Prisma.UserWhereInput[] = [eligibleUserWhere, { id: { not: user.id } }];
    if (parsed.mode === 'email') {
      // Exact match only; the address itself is never returned.
      and.push({ email: { equals: parsed.value, mode: 'insensitive' } });
    } else {
      and.push({
        OR: [
          { fullName: { contains: parsed.value, mode: 'insensitive' } },
          { institute: { contains: parsed.value, mode: 'insensitive' } },
          { department: { contains: parsed.value, mode: 'insensitive' } },
        ],
      });
    }
    if (cursor) {
      and.push({
        OR: [{ fullName: { gt: cursor.n } }, { fullName: cursor.n, id: { gt: cursor.i } }],
      });
    }
    const rows = await this.prisma.user.findMany({
      where: { AND: and },
      orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      select: PERSON_SELECT,
    });
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: await this.peopleFor(user.id, page),
      nextCursor: rows.length > limit && last ? encodeCursor({ n: last.fullName, i: last.id }) : null,
    };
  }

  private async findEligible(userId: string) {
    if (!userId) return null;
    return this.prisma.user.findFirst({
      where: { AND: [eligibleUserWhere, { id: userId }] },
      select: PERSON_SELECT,
    });
  }

  async getPerson(user: AuthUser, userId: string) {
    const row = await this.prisma.user.findFirst({
      where: { AND: [eligibleUserWhere, { id: userId }] },
      select: { ...PERSON_SELECT, linkedinUrl: true, domainTags: true, createdAt: true },
    });
    if (!row) throw new NotFoundException('Person not found');

    const accessOf = (id: string): Prisma.TeamWhereInput => ({
      OR: [
        { leaderUserId: id },
        { members: { some: { userId: id } } },
        { mentorAssignments: { some: { mentorUserId: id, active: true } } },
      ],
    });
    const [people, shared] = await Promise.all([
      this.peopleFor(user.id, [row], DETAIL_AVATAR_MAX_CHARS),
      row.id === user.id
        ? Promise.resolve(null)
        : this.prisma.team.findFirst({
            where: { status: { not: 'disqualified' }, AND: [accessOf(user.id), accessOf(row.id)] },
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true },
          }),
    ]);
    const safe = safeProfileFromJson(row.profileJson);
    return {
      person: people[0],
      profile: {
        headline: safe.headline,
        bio: safe.bio,
        skills: safe.skills,
        domainTags: cleanList(row.domainTags, 15, 40),
        linkedinUrl: safeHttpUrl(row.linkedinUrl),
        institute: cleanText(row.institute, 200),
        department: cleanText(row.department, 120),
        memberSince: row.createdAt.toISOString(),
        sharedTeam: shared ? { id: shared.id, name: shared.name } : null,
      },
    };
  }

  /* ---------------- friends ---------------- */

  async sendFriendRequest(user: AuthUser, targetId: string) {
    await consumeToken(`chat-friend-req:${user.id}`, 10);
    const target = await this.findEligible(targetId);
    if (!target && targetId !== user.id) throw new NotFoundException('Person not found');
    if (!target) throw new BadRequestException('You cannot send a friend request to yourself.');

    const key = pairKey(user.id, target.id);
    for (let attempt = 0; attempt < 2; attempt++) {
      const existing = await this.prisma.friendship.findUnique({ where: { pairKey: key } });
      const decision = decideFriendRequest({ actorId: user.id, targetId: target.id, existing });

      if (decision.action === 'reject') {
        throw new HttpException(decision.message, decision.httpStatus);
      }
      if (decision.action === 'noop' && existing) {
        return this.requestResult(user.id, existing, target);
      }
      if (decision.action === 'auto_accept' && existing) {
        await this.prisma.friendship.updateMany({
          where: { id: existing.id, status: FriendshipStatus.pending },
          data: { status: FriendshipStatus.accepted, respondedAt: new Date() },
        });
        const fresh = await this.prisma.friendship.findUnique({ where: { id: existing.id } });
        if (fresh) {
          if (fresh.status === FriendshipStatus.accepted) {
            void this.notifySafe(target.id, 'Friend request accepted', `${user.fullName} is now your friend.`, fresh.id);
          }
          return this.requestResult(user.id, fresh, target);
        }
        continue;
      }
      try {
        let row;
        if (decision.action === 'recreate' && existing) {
          // Guarded by the observed status so two racing requests cannot both revive the row.
          const res = await this.prisma.friendship.updateMany({
            where: { id: existing.id, status: FriendshipStatus.declined },
            data: {
              requesterId: user.id,
              addresseeId: target.id,
              status: FriendshipStatus.pending,
              createdAt: new Date(),
              respondedAt: null,
            },
          });
          if (!res.count) continue;
          row = await this.prisma.friendship.findUnique({ where: { id: existing.id } });
        } else {
          row = await this.prisma.friendship.create({
            data: { requesterId: user.id, addresseeId: target.id, pairKey: key },
          });
        }
        if (!row) continue;
        void this.notifySafe(
          target.id,
          'New friend request',
          `${user.fullName} sent you a friend request.`,
          row.id,
        );
        return this.requestResult(user.id, row, target);
      } catch (err) {
        if ((err as { code?: string })?.code === 'P2002') continue; // lost a create race: re-decide
        throw err;
      }
    }
    throw new ConflictException('Could not send the request right now. Please try again.');
  }

  private async requestResult(
    meId: string,
    row: { id: string; status: FriendshipStatus; requesterId: string },
    target: PersonRow,
  ) {
    const friendship: FriendshipInfo =
      row.status === FriendshipStatus.accepted
        ? { status: 'friends', requestId: row.id }
        : row.status === FriendshipStatus.pending
          ? { status: row.requesterId === meId ? 'outgoing' : 'incoming', requestId: row.id }
          : { status: 'none' };
    return { id: row.id, status: row.status, person: this.toPerson(target, friendship) };
  }

  /** In-app only (no email). Never fails the caller. */
  private async notifySafe(userId: string, title: string, body: string, friendshipId: string) {
    try {
      await createNotifications(this.prisma, [userId], {
        type: 'status_change',
        title,
        body,
        relatedEntity: `friend:${friendshipId}`,
      });
    } catch (err) {
      console.error('[chat] friend notification failed', err);
    }
  }

  async listFriends(user: AuthUser) {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.accepted,
        OR: [{ requesterId: user.id }, { addresseeId: user.id }],
      },
      select: {
        id: true,
        respondedAt: true,
        createdAt: true,
        requesterId: true,
        requester: { select: { ...PERSON_SELECT, isActive: true } },
        addressee: { select: { ...PERSON_SELECT, isActive: true } },
      },
    });
    const items = rows
      .map((r) => {
        const other = r.requesterId === user.id ? r.addressee : r.requester;
        return { other, since: (r.respondedAt ?? r.createdAt).toISOString(), id: r.id };
      })
      .filter((r) => r.other.isActive && chatRoleOf(r.other))
      .map((r) => ({
        ...this.toPerson(r.other, { status: 'friends', requestId: r.id }),
        since: r.since,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName) || a.id.localeCompare(b.id));
    return { items };
  }

  async listRequests(user: AuthUser) {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.pending,
        OR: [{ requesterId: user.id }, { addresseeId: user.id }],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        createdAt: true,
        requesterId: true,
        requester: { select: { ...PERSON_SELECT, isActive: true } },
        addressee: { select: { ...PERSON_SELECT, isActive: true } },
      },
    });
    const incoming: Array<{ id: string; person: Person; createdAt: string }> = [];
    const outgoing: Array<{ id: string; person: Person; createdAt: string }> = [];
    for (const r of rows) {
      const isOutgoing = r.requesterId === user.id;
      const other = isOutgoing ? r.addressee : r.requester;
      if (!other.isActive || !chatRoleOf(other)) continue;
      const entry = {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        person: this.toPerson(other, { status: isOutgoing ? 'outgoing' : 'incoming', requestId: r.id }),
      };
      (isOutgoing ? outgoing : incoming).push(entry);
    }
    return { incoming, outgoing };
  }

  private async loadRequestFor(id: string) {
    const row = await this.prisma.friendship.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Friend request not found');
    return row;
  }

  async acceptRequest(user: AuthUser, id: string) {
    const row = await this.loadRequestFor(id);
    if (row.addresseeId !== user.id) {
      throw new ForbiddenException(
        row.requesterId === user.id ? 'You cannot accept your own request.' : 'Friend request not found',
      );
    }
    const requester = await this.findEligible(row.requesterId);
    if (!requester) throw new NotFoundException('This person is no longer available.');
    const res = await this.prisma.friendship.updateMany({
      where: { id, addresseeId: user.id, status: FriendshipStatus.pending },
      data: { status: FriendshipStatus.accepted, respondedAt: new Date() },
    });
    if (!res.count) {
      const fresh = await this.loadRequestFor(id);
      if (fresh.status !== FriendshipStatus.accepted) {
        throw new ConflictException('This request was already handled.');
      }
    } else {
      void this.notifySafe(requester.id, 'Friend request accepted', `${user.fullName} accepted your friend request.`, id);
    }
    return { ok: true, person: this.toPerson(requester, { status: 'friends', requestId: id }) };
  }

  async declineRequest(user: AuthUser, id: string) {
    const row = await this.loadRequestFor(id);
    if (row.addresseeId !== user.id) {
      throw new ForbiddenException(
        row.requesterId === user.id ? 'You cannot decline your own request.' : 'Friend request not found',
      );
    }
    const res = await this.prisma.friendship.updateMany({
      where: { id, addresseeId: user.id, status: FriendshipStatus.pending },
      data: { status: FriendshipStatus.declined, respondedAt: new Date() },
    });
    if (!res.count) {
      const fresh = await this.loadRequestFor(id);
      if (fresh.status !== FriendshipStatus.declined) {
        throw new ConflictException('This request was already handled.');
      }
    }
    return { ok: true };
  }

  async cancelRequest(user: AuthUser, id: string) {
    const row = await this.loadRequestFor(id);
    if (row.requesterId !== user.id) {
      throw new ForbiddenException(
        row.addresseeId === user.id ? 'Only the sender can cancel a request.' : 'Friend request not found',
      );
    }
    const res = await this.prisma.friendship.deleteMany({
      where: { id, requesterId: user.id, status: FriendshipStatus.pending },
    });
    if (!res.count) {
      const still = await this.prisma.friendship.findUnique({ where: { id } });
      if (still) throw new ConflictException('This request was already handled.');
    }
    return { ok: true };
  }

  async unfriend(user: AuthUser, otherId: string) {
    await this.prisma.friendship.deleteMany({
      where: { pairKey: pairKey(user.id, otherId), status: FriendshipStatus.accepted },
    });
    return { ok: true };
  }

  /* ---------------- direct messages ---------------- */

  private async assertFriends(meId: string, otherId: string) {
    const msg = 'You can only message people you are friends with.';
    if (!otherId || otherId === meId) throw new ForbiddenException(msg);
    const [fr, other] = await Promise.all([
      this.prisma.friendship.findUnique({ where: { pairKey: pairKey(meId, otherId) }, select: { status: true } }),
      this.prisma.user.findFirst({ where: { AND: [eligibleUserWhere, { id: otherId }] }, select: { id: true } }),
    ]);
    if (!fr || fr.status !== FriendshipStatus.accepted || !other) throw new ForbiddenException(msg);
  }

  async listMessages(
    user: AuthUser,
    otherId: string,
    q: { after?: string; before?: string; limit?: string },
  ) {
    await this.assertFriends(user.id, otherId);
    const key = pairKey(user.id, otherId);
    const limit = clampLimit(q.limit, 50, 100);
    const anchorId = q.after || q.before;
    let anchor: { id: string; createdAt: Date } | null = null;
    if (anchorId) {
      anchor = await this.prisma.directMessage.findFirst({
        where: { id: anchorId, pairKey: key },
        select: { id: true, createdAt: true },
      });
      if (!anchor) throw new BadRequestException('That message could not be found in this conversation.');
    }

    let where: Prisma.DirectMessageWhereInput = { pairKey: key };
    let direction: 'asc' | 'desc' = 'desc';
    if (anchor && q.after) {
      direction = 'asc';
      where = {
        pairKey: key,
        OR: [{ createdAt: { gt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { gt: anchor.id } }],
      };
    } else if (anchor) {
      where = {
        pairKey: key,
        OR: [{ createdAt: { lt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { lt: anchor.id } }],
      };
    }
    const rows = await this.prisma.directMessage.findMany({
      where,
      orderBy: [{ createdAt: direction }, { id: direction }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    if (direction === 'desc') page.reverse();
    return { items: page.map(toDm), hasMore };
  }

  async sendMessage(user: AuthUser, otherId: string, input: { body: string; clientId?: string | null }) {
    const parsed = normalizeMessageBody(input.body);
    if (!parsed.ok) throw new BadRequestException(parsed.error);
    const clientId = input.clientId?.trim() ? input.clientId.trim().slice(0, CLIENT_ID_MAX_LENGTH) : null;
    await consumeToken(`chat-dm:${user.id}`, 60);
    await this.assertFriends(user.id, otherId);

    if (clientId) {
      const dup = await this.prisma.directMessage.findUnique({
        where: { senderId_clientId: { senderId: user.id, clientId } },
      });
      if (dup) return toDm(dup);
    }
    try {
      const row = await this.prisma.directMessage.create({
        data: {
          pairKey: pairKey(user.id, otherId),
          senderId: user.id,
          recipientId: otherId,
          body: parsed.body,
          clientId,
        },
      });
      return toDm(row);
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002' && clientId) {
        const dup = await this.prisma.directMessage.findUnique({
          where: { senderId_clientId: { senderId: user.id, clientId } },
        });
        if (dup) return toDm(dup);
      }
      throw err;
    }
  }

  async markDmRead(user: AuthUser, otherId: string) {
    const res = await this.prisma.directMessage.updateMany({
      where: { senderId: otherId, recipientId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true, marked: res.count };
  }

  async deleteMessage(user: AuthUser, messageId: string) {
    const res = await this.prisma.directMessage.updateMany({
      where: { id: messageId, senderId: user.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!res.count) {
      const row = await this.prisma.directMessage.findFirst({
        where: { id: messageId, senderId: user.id },
        select: { id: true },
      });
      // Already deleted is a success (idempotent); someone else's or unknown id is a 404.
      if (!row) throw new NotFoundException('Message not found');
    }
    return { ok: true };
  }

  /* ---------------- groups ---------------- */

  async markGroupRead(user: AuthUser, teamId: string) {
    await this.teams.assertTeamAccess(user, teamId);
    const now = new Date();
    await this.prisma.chatReadState.upsert({
      where: { userId_teamId: { userId: user.id, teamId } },
      create: { userId: user.id, teamId, lastReadAt: now },
      update: { lastReadAt: now },
    });
    return { ok: true };
  }

  private groupTeamsWhere(userId: string): Prisma.TeamWhereInput {
    // Same access rule as GET /teams/:teamId/comments (leader, member, assigned mentor) minus the
    // admin bypass: admins only appear here if they also hold a chat role AND belong to the team.
    return {
      status: { not: 'disqualified' },
      OR: [
        { leaderUserId: userId },
        { members: { some: { userId } } },
        { mentorAssignments: { some: { mentorUserId: userId, active: true } } },
      ],
    };
  }

  /** Unread comments by others per team: newer than the read marker, else the last 30 days. */
  private async groupUnreadByTeam(userId: string, teamIds: string[]) {
    const out = new Map<string, number>();
    if (!teamIds.length) return out;
    const rows = await this.prisma.$queryRaw<Array<{ team_id: string; n: bigint }>>(Prisma.sql`
      SELECT c.team_id AS team_id, COUNT(*) AS n
      FROM comments c
      LEFT JOIN chat_read_states s ON s.team_id = c.team_id AND s.user_id = ${userId}
      WHERE c.team_id IN (${Prisma.join(teamIds)})
        AND c.author_user_id <> ${userId}
        AND c.created_at > COALESCE(s.last_read_at, NOW() - (${GROUP_UNREAD_FALLBACK_DAYS} * INTERVAL '1 day'))
      GROUP BY c.team_id
    `);
    for (const r of rows) out.set(r.team_id, Number(r.n));
    return out;
  }

  private async friendIds(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: { status: FriendshipStatus.accepted, OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { requesterId: true, addresseeId: true },
    });
    return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
  }

  async unreadSummary(user: AuthUser) {
    const [teams, friendIds] = await Promise.all([
      this.prisma.team.findMany({
        where: this.groupTeamsWhere(user.id),
        select: { id: true },
        take: MAX_CONVERSATIONS,
      }),
      this.friendIds(user.id),
    ]);
    const [groupMap, dm] = await Promise.all([
      this.groupUnreadByTeam(
        user.id,
        teams.map((t) => t.id),
      ),
      friendIds.length
        ? this.prisma.directMessage.count({
            where: { recipientId: user.id, readAt: null, deletedAt: null, senderId: { in: friendIds } },
          })
        : Promise.resolve(0),
    ]);
    let groups = 0;
    for (const n of groupMap.values()) groups += n;
    return { total: groups + dm, dm, groups };
  }

  /* ---------------- conversations ---------------- */

  async listConversations(user: AuthUser) {
    const [teams, friendRows] = await Promise.all([
      this.prisma.team.findMany({
        where: this.groupTeamsWhere(user.id),
        select: { id: true, name: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: MAX_CONVERSATIONS,
      }),
      this.prisma.friendship.findMany({
        where: {
          status: FriendshipStatus.accepted,
          OR: [{ requesterId: user.id }, { addresseeId: user.id }],
        },
        take: MAX_CONVERSATIONS,
        select: {
          id: true,
          createdAt: true,
          respondedAt: true,
          requesterId: true,
          requester: { select: { ...PERSON_SELECT, isActive: true } },
          addressee: { select: { ...PERSON_SELECT, isActive: true } },
        },
      }),
    ]);
    const teamIds = teams.map((t) => t.id);
    const friends = friendRows
      .map((r) => ({
        id: r.id,
        since: r.respondedAt ?? r.createdAt,
        other: r.requesterId === user.id ? r.addressee : r.requester,
      }))
      .filter((f) => f.other.isActive && chatRoleOf(f.other));
    const keys = friends.map((f) => pairKey(user.id, f.other.id));

    const [lastComments, groupUnread, lastDms, dmUnread] = await Promise.all([
      teamIds.length
        ? this.prisma.$queryRaw<
            Array<{ team_id: string; message: string; created_at: Date; author_user_id: string; full_name: string }>
          >(Prisma.sql`
            SELECT DISTINCT ON (c.team_id) c.team_id, c.message, c.created_at, c.author_user_id, u.full_name
            FROM comments c
            JOIN users u ON u.id = c.author_user_id
            WHERE c.team_id IN (${Prisma.join(teamIds)})
            ORDER BY c.team_id, c.created_at DESC, c.id DESC
          `)
        : Promise.resolve([]),
      this.groupUnreadByTeam(user.id, teamIds),
      keys.length
        ? this.prisma.$queryRaw<
            Array<{ pair_key: string; body: string; created_at: Date; sender_id: string; deleted_at: Date | null }>
          >(Prisma.sql`
            SELECT DISTINCT ON (pair_key) pair_key, body, created_at, sender_id, deleted_at
            FROM direct_messages
            WHERE pair_key IN (${Prisma.join(keys)})
            ORDER BY pair_key, created_at DESC, id DESC
          `)
        : Promise.resolve([]),
      keys.length
        ? this.prisma.directMessage.groupBy({
            by: ['senderId'],
            where: {
              recipientId: user.id,
              readAt: null,
              deletedAt: null,
              senderId: { in: friends.map((f) => f.other.id) },
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    const commentByTeam = new Map(lastComments.map((c) => [c.team_id, c]));
    const dmByKey = new Map(lastDms.map((d) => [d.pair_key, d]));
    const dmUnreadBy = new Map(dmUnread.map((d) => [d.senderId, d._count._all]));

    type Conv = {
      id: string;
      type: 'group' | 'dm';
      title: string;
      subtitle: string | null;
      avatarUrl: string | null;
      teamId?: string;
      person?: Person;
      lastMessage: { preview: string; createdAt: string; senderName: string; mine: boolean } | null;
      unread: number;
      updatedAt: string;
    };
    const items: Conv[] = [];

    for (const t of teams) {
      const c = commentByTeam.get(t.id);
      items.push({
        id: `team:${t.id}`,
        type: 'group',
        title: t.name,
        subtitle: 'Team + mentors',
        avatarUrl: null,
        teamId: t.id,
        lastMessage: c
          ? {
              preview: previewText(c.message),
              createdAt: c.created_at.toISOString(),
              senderName: c.full_name,
              mine: c.author_user_id === user.id,
            }
          : null,
        unread: groupUnread.get(t.id) ?? 0,
        updatedAt: (c?.created_at ?? t.updatedAt).toISOString(),
      });
    }

    for (const f of friends) {
      const d = dmByKey.get(pairKey(user.id, f.other.id));
      const person = this.toPerson(f.other, { status: 'friends', requestId: f.id });
      const mine = d?.sender_id === user.id;
      items.push({
        id: `dm:${f.other.id}`,
        type: 'dm',
        title: person.fullName,
        subtitle: person.roleLabel,
        avatarUrl: person.avatarUrl,
        person,
        lastMessage: d
          ? {
              preview: previewText(d.body, d.deleted_at !== null),
              createdAt: d.created_at.toISOString(),
              senderName: mine ? user.fullName : person.fullName,
              mine,
            }
          : null,
        unread: dmUnreadBy.get(f.other.id) ?? 0,
        updatedAt: (d?.created_at ?? f.since).toISOString(),
      });
    }

    items.sort((a, b) => {
      if (a.lastMessage && b.lastMessage) {
        return b.lastMessage.createdAt.localeCompare(a.lastMessage.createdAt) || a.id.localeCompare(b.id);
      }
      if (a.lastMessage) return -1;
      if (b.lastMessage) return 1;
      return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
    });
    const capped = items.slice(0, MAX_CONVERSATIONS);
    return { items: capped, unreadTotal: capped.reduce((n, c) => n + c.unread, 0) };
  }
}
