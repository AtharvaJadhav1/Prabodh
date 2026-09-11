"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";
import { dashboardForRole } from "../../lib/session";
import LoginPasswordForm from "./LoginPasswordForm";

export default function FacultyForm() {
  const router = useRouter();
  const { establishSession } = useAuth();

  return (
    <LoginPasswordForm
      portal="faculty"
      title="Faculty & Evaluator Sign In"
      description="Sign in with your official university email. Admin, institute mentor, and industry mentor dashboards follow your account role."
      submitLabel="Sign in"
      onSuccess={(result) => {
        establishSession(result);
        router.replace(dashboardForRole(result.platformRole));
      }}
    />
  );
}
