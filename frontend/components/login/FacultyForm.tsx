"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";
import { dashboardForRole } from "../../lib/session";
import OtpAuthFlow from "./OtpAuthFlow";

export default function FacultyForm() {
  const router = useRouter();
  const { establishSession } = useAuth();

  return (
    <OtpAuthFlow
      purpose="login"
      title="Faculty & Evaluator Sign In"
      description="Sign in with your official university email. Admin, institute mentor, and industry mentor dashboards follow your account role."
      submitLabel="Sign in"
      onSuccess={(result) => {
        establishSession(result);
        router.push(dashboardForRole(result.platformRole as never));
      }}
    />
  );
}
