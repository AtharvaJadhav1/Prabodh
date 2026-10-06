import type { ComponentType } from "react";
import type { NotificationIconKind } from "../../lib/notification-links";
import {
  BadgeCheckIcon,
  BriefcaseIcon,
  GradCapIcon,
  InboxIcon,
  InfoIcon,
  MessageIcon,
  UserCheckIcon,
  UserPlusIcon,
  UsersIcon,
} from "../dashboard/icons";

type IconType = ComponentType<{ className?: string }>;

const MAP: Record<NotificationIconKind, { Icon: IconType; tone: string }> = {
  team: { Icon: UsersIcon, tone: "bg-[#E8F0FA] text-[#2F5D9A]" },
  invite: { Icon: UserPlusIcon, tone: "bg-brand-lightOrange text-[#C25E26]" },
  friend: { Icon: UserCheckIcon, tone: "bg-[#E7F3EC] text-brand-approved" },
  mentor: { Icon: GradCapIcon, tone: "bg-[#F1E9F7] text-[#6B3FA0]" },
  comment: { Icon: MessageIcon, tone: "bg-[#E6F4F4] text-[#1F7A7A]" },
  broadcast: { Icon: InboxIcon, tone: "bg-[#FFF3D6] text-[#9A6A00]" },
  allocation: { Icon: BriefcaseIcon, tone: "bg-[#E8F0FA] text-[#2F5D9A]" },
  approval: { Icon: BadgeCheckIcon, tone: "bg-[#E7F3EC] text-brand-approved" },
  info: { Icon: InfoIcon, tone: "bg-brand-sand/60 text-brand-muted" },
};

export default function NotificationIcon({ kind, className = "" }: { kind: NotificationIconKind; className?: string }) {
  const { Icon, tone } = MAP[kind];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone} ${className}`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}
