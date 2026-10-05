"use client";

import { createContext, useContext } from "react";
import type { ChatPerson, Friendship } from "../../lib/chat-types";

export type ChatPeopleActions = {
  friendshipOf: (person: ChatPerson) => Friendship;
  isBusy: (userId: string) => boolean;
  add: (person: ChatPerson) => void;
  cancel: (person: ChatPerson, requestId?: string) => void;
  accept: (person: ChatPerson, requestId?: string) => void;
  decline: (person: ChatPerson, requestId?: string) => void;
  unfriend: (person: ChatPerson) => void;
  openProfile: (userId: string) => void;
  openDm: (person: ChatPerson) => void;
};

const Ctx = createContext<ChatPeopleActions | null>(null);

export const ChatPeopleProvider = Ctx.Provider;

export function useChatPeople(): ChatPeopleActions {
  const v = useContext(Ctx);
  if (!v) throw new Error("useChatPeople must be used inside ChatWorkspace");
  return v;
}
