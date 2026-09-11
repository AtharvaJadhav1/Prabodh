"use client";

import { useState } from "react";
import type { Broadcast } from "../../data/adminDashboard";
import { audienceLabels } from "../../data/adminDashboard";
import { SendIcon } from "../dashboard/icons";

type Props = {
  onSend: (b: Omit<Broadcast, "id" | "sentAt" | "sentBy">) => void;
};

export default function BroadcastForm({ onSend }: Props) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<Broadcast["audience"]>("all");

  const submit = () => {
    if (!title.trim() || !message.trim()) return;
    onSend({ title: title.trim(), message: message.trim(), audience });
    setTitle("");
    setMessage("");
    setAudience("all");
  };

  return (
    <div className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-brand-deep">New Broadcast</h2>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-brand-deep">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Deadline Extension"
            className="w-full rounded-xl border border-brand-sand bg-white px-4 py-2.5 text-sm font-medium text-brand-charcoal shadow-sm transition-all placeholder:text-brand-charcoal/50 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-brand-deep">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Write your announcement..."
            className="w-full rounded-xl border border-brand-sand bg-white px-4 py-2.5 text-sm font-medium text-brand-charcoal shadow-sm transition-all placeholder:text-brand-charcoal/50 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-brand-deep">Audience</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as Broadcast["audience"])}
            className="w-full rounded-xl border border-brand-sand bg-white px-4 py-2.5 text-sm font-medium text-brand-charcoal shadow-sm transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
          >
            {Object.entries(audienceLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-hover active:scale-95"
        >
          <SendIcon className="h-3.5 w-3.5" />
          Send Broadcast
        </button>
      </div>
    </div>
  );
}
