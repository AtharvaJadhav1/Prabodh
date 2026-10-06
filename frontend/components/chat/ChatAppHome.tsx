"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import AppMenu from "./app/AppMenu";
import { CloseIcon, NewChatIcon, SearchIcon } from "./chat-icons";

export type AppTabId = "chats" | "friends" | "people";

type Props = {
  tabs: Array<{ id: AppTabId; label: string; badge: number }>;
  tab: AppTabId;
  onTab: (id: AppTabId) => void;
  onTabKey: (e: KeyboardEvent, idx: number) => void;
  registerTab: (id: AppTabId, el: HTMLButtonElement | null) => void;
  query: string;
  onQuery: (q: string) => void;
  onNewChat: () => void;
  children: ReactNode;
};

const SEARCH_PLACEHOLDER: Record<AppTabId, string> = {
  chats: "Search chats",
  friends: "Search friends",
  people: "Name, college or @email",
};

const SEARCH_LABEL: Record<AppTabId, string> = {
  chats: "Search your chats",
  friends: "Search your friends",
  people: "Search people by name, college, or type @ and an exact email address",
};

function badgeLabel(id: AppTabId, n: number): string {
  return id === "friends" ? `${n} friend requests` : `${n} unread chats`;
}

/** WhatsApp-style home chrome: header, search, filter chips and a floating new-chat button around the active panel. */
export default function ChatAppHome({ tabs, tab, onTab, onTabKey, registerTab, query, onQuery, onNewChat, children }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // A new tab starts at the top of its own list.
  useEffect(() => setScrolled(false), [tab]);

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col bg-chat-bg text-chat-text">
      <div
        className={`relative z-30 shrink-0 bg-chat-header transition-shadow duration-200 motion-reduce:transition-none ${
          scrolled ? "shadow-[0_1px_0_var(--chat-line),0_4px_12px_rgba(0,0,0,0.08)]" : "shadow-[0_1px_0_transparent]"
        }`}
      >
        <header className="flex h-14 items-center justify-between gap-2 pl-4 pr-2" style={{ boxSizing: "content-box", paddingTop: "env(safe-area-inset-top)" }}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-cream ring-1 ring-chat-line">
              <Image src="/images/logo/Prabodh_Icon_Only_Web_1000px.png" alt="" width={40} height={40} className="h-7 w-7 object-contain" priority />
            </span>
            <h1 className="truncate text-[22px] font-extrabold leading-none tracking-tight text-chat-brandText">Prabodh</h1>
          </div>
          <AppMenu />
        </header>

        <div className="px-4 pb-1 pt-1">
          <label htmlFor="chat-app-search" className="sr-only">
            {SEARCH_LABEL[tab]}
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-chat-muted" />
            <input
              id="chat-app-search"
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder={SEARCH_PLACEHOLDER[tab]}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="search"
              className="h-11 w-full appearance-none rounded-full bg-chat-field pl-11 pr-11 text-[16px] text-chat-text outline-none ring-1 ring-transparent transition-[box-shadow,background-color] duration-200 placeholder:text-chat-muted focus:bg-chat-surface focus:ring-2 focus:ring-chat-brand motion-reduce:transition-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  onQuery("");
                  searchRef.current?.focus();
                }}
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full text-chat-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-chat-brand"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-chat-press">
                  <CloseIcon className="h-3.5 w-3.5" />
                </span>
              </button>
            ) : null}
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Chat sections"
          className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((t, i) => {
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => registerTab(t.id, el)}
                type="button"
                role="tab"
                id={`chat-tab-${t.id}`}
                aria-selected={selected}
                aria-controls="chat-tabpanel"
                tabIndex={selected ? 0 : -1}
                onClick={() => onTab(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className="group flex h-11 shrink-0 items-center focus-visible:outline-none"
              >
                <span
                  className={`flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold transition-colors duration-150 group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-chat-brand motion-reduce:transition-none motion-reduce:group-active:scale-100 ${
                    selected ? "bg-chat-brandSoft text-chat-brandText" : "bg-chat-field text-chat-muted"
                  }`}
                >
                  {t.label}
                  {t.badge > 0 ? (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-chat-brand px-1 text-[11px] font-bold leading-none text-white">
                      <span aria-hidden="true">{t.badge > 99 ? "99+" : t.badge}</span>
                      <span className="sr-only">{badgeLabel(t.id, t.badge)}</span>
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        id="chat-tabpanel"
        role="tabpanel"
        aria-labelledby={`chat-tab-${tab}`}
        className="flex min-h-0 flex-1 flex-col"
        onScrollCapture={(e) => {
          const t = e.target;
          if (t instanceof HTMLElement) setScrolled(t.scrollTop > 2);
        }}
      >
        {children}
      </div>

      {tab !== "people" ? (
        <button
          type="button"
          onClick={onNewChat}
          aria-label="New chat: find people"
          className="absolute right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-amber to-chat-brand text-white shadow-[0_6px_18px_rgba(217,107,39,0.45)] transition-transform duration-150 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chat-brand"
          style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        >
          <NewChatIcon className="h-6 w-6" />
        </button>
      ) : null}
    </div>
  );
}
