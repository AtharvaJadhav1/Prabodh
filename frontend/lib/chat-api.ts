import { api, apiDelete, apiPost } from "./api";
import type { PortalComment } from "./types";
import type {
  ChatConversationList,
  ChatFriend,
  ChatFriendRequests,
  ChatPeoplePage,
  ChatPerson,
  ChatPersonDetail,
  ChatUnread,
  DirectMessage,
  DirectMessagePage,
} from "./chat-types";

type Opts = { signal?: AbortSignal };

const enc = encodeURIComponent;

export function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    ((err as { name: unknown }).name === "AbortError" || (err as { name: unknown }).name === "TimeoutError")
  );
}

function get<T>(path: string, opts?: Opts) {
  return api<T>(path, { signal: opts?.signal });
}

export function searchPeople(q: string, opts?: Opts & { cursor?: string | null; limit?: number }) {
  const p = new URLSearchParams({ q, limit: String(opts?.limit ?? 20) });
  if (opts?.cursor) p.set("cursor", opts.cursor);
  return get<ChatPeoplePage>(`/chat/people?${p.toString()}`, opts);
}

export function getPerson(userId: string, opts?: Opts) {
  return get<ChatPersonDetail>(`/chat/people/${enc(userId)}`, opts);
}

export function sendFriendRequest(userId: string) {
  return apiPost<{ id: string; status: string; person: ChatPerson }>("/chat/friends/requests", { userId });
}

export function listFriends(opts?: Opts) {
  return get<{ items: ChatFriend[] }>("/chat/friends", opts);
}

export function listFriendRequests(opts?: Opts) {
  return get<ChatFriendRequests>("/chat/friends/requests", opts);
}

export function acceptFriendRequest(requestId: string) {
  return apiPost<{ ok: boolean; person: ChatPerson }>(`/chat/friends/requests/${enc(requestId)}/accept`, {});
}

export function declineFriendRequest(requestId: string) {
  return apiPost<{ ok: boolean }>(`/chat/friends/requests/${enc(requestId)}/decline`, {});
}

export function cancelFriendRequest(requestId: string) {
  return apiDelete<{ ok: boolean }>(`/chat/friends/requests/${enc(requestId)}`);
}

export function unfriend(userId: string) {
  return apiDelete<{ ok: boolean }>(`/chat/friends/${enc(userId)}`);
}

export function listConversations(opts?: Opts) {
  return get<ChatConversationList>("/chat/conversations", opts);
}

export function getDmMessages(userId: string, opts?: Opts & { after?: string; before?: string; limit?: number }) {
  const p = new URLSearchParams({ limit: String(opts?.limit ?? 50) });
  if (opts?.after) p.set("after", opts.after);
  if (opts?.before) p.set("before", opts.before);
  return get<DirectMessagePage>(`/chat/dm/${enc(userId)}/messages?${p.toString()}`, opts);
}

export function sendDmMessage(userId: string, body: string, clientId: string) {
  return apiPost<DirectMessage>(`/chat/dm/${enc(userId)}/messages`, { body, clientId });
}

export function markDmRead(userId: string) {
  return apiPost<{ ok: boolean; marked: number }>(`/chat/dm/${enc(userId)}/read`, {});
}

export function markGroupRead(teamId: string) {
  return apiPost<{ ok: boolean }>(`/chat/groups/${enc(teamId)}/read`, {});
}

export function deleteDmMessage(messageId: string) {
  return apiDelete<{ ok: boolean }>(`/chat/dm/messages/${enc(messageId)}`);
}

export function getChatUnread(opts?: Opts) {
  return get<ChatUnread>("/chat/unread", opts);
}

export function getGroupComments(teamId: string, opts?: Opts) {
  return get<PortalComment[]>(`/teams/${enc(teamId)}/comments`, opts);
}

export function postGroupComment(teamId: string, message: string) {
  return apiPost<PortalComment>(`/teams/${enc(teamId)}/comments`, { message });
}

export function deleteGroupComment(teamId: string, commentId: string) {
  return apiDelete<unknown>(`/teams/${enc(teamId)}/comments/${enc(commentId)}`);
}
