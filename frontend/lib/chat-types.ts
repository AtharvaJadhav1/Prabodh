export type FriendshipStatus = "none" | "friends" | "outgoing" | "incoming";

export type Friendship = { status: FriendshipStatus; requestId?: string };

export type ChatPerson = {
  id: string;
  fullName: string;
  platformRole: string;
  roleLabel: string;
  institute: string | null;
  department: string | null;
  avatarUrl: string | null;
  friendship: Friendship;
};

export type ChatPersonProfile = {
  headline: string | null;
  bio: string | null;
  skills: string[];
  domainTags: string[];
  linkedinUrl: string | null;
  institute: string | null;
  department: string | null;
  memberSince: string;
  sharedTeam: { id: string; name: string } | null;
};

export type ChatPeoplePage = { items: ChatPerson[]; nextCursor: string | null };

export type ChatPersonDetail = { person: ChatPerson; profile: ChatPersonProfile };

export type ChatFriend = ChatPerson & { since: string };

export type ChatFriendRequest = { id: string; person: ChatPerson; createdAt: string };

export type ChatFriendRequests = { incoming: ChatFriendRequest[]; outgoing: ChatFriendRequest[] };

export type ChatConversationType = "group" | "dm";

export type ChatConversation = {
  id: string;
  type: ChatConversationType;
  kind?: "support";
  pinned?: boolean;
  title: string;
  subtitle: string | null;
  avatarUrl: string | null;
  teamId?: string;
  person?: ChatPerson;
  lastMessage: { preview: string; createdAt: string; senderName: string; mine: boolean } | null;
  unread: number;
  updatedAt: string;
};

export type ChatConversationList = {
  items: ChatConversation[];
  unreadTotal: number;
  /** Server stores new direct messages encrypted at rest. Absent on older servers: treat as false. */
  encryptionAtRest?: boolean;
};

export type DirectMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  deleted: boolean;
  clientId: string | null;
};

export type DirectMessagePage = { items: DirectMessage[]; hasMore: boolean };

export type ChatUnread = { total: number; dm: number; groups: number };

export type MessageStatus = "sending" | "failed" | "sent" | "read";

/** Unified message shape used by the thread UI for both DM and group conversations. */
export type ChatMessage = {
  /** Stable React key: server id once known, otherwise the client id. */
  key: string;
  id: string | null;
  clientId: string | null;
  senderId: string;
  senderName: string;
  senderRole: string | null;
  senderAvatarUrl: string | null;
  senderEmail: string | null;
  body: string;
  createdAt: string;
  deleted: boolean;
  mine: boolean;
  status: MessageStatus;
};
