import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { CLERK_PUBLISHABLE_KEY } from "../../lib/config";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  if (!CLERK_PUBLISHABLE_KEY) return children;

  const { userId } = await auth();
  if (!userId) {
    redirect("/login/student");
  }

  return children;
}
