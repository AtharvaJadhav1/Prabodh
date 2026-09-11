"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";
import { dashboardForRole } from "../../lib/session";
import LoginPasswordForm from "./LoginPasswordForm";

export default function StudentForm() {
  const router = useRouter();
  const { establishSession } = useAuth();

  return (
    <LoginPasswordForm
      portal="student"
      title="Student Team Sign In"
      description="Sign in with your institutional email and password."
      submitLabel="Sign in to student workspace"
      footer={
        <p className="text-center text-sm text-brand-muted">
          New to the portal?{" "}
          <a href="/register" className="font-semibold text-brand-primary hover:text-brand-hover">
            Create a student account
          </a>
        </p>
      }
      onSuccess={(result) => {
        establishSession(result);
        router.replace(
          result.platformRole === "student"
            ? "/dashboard/student"
            : dashboardForRole(result.platformRole),
        );
      }}
    />
  );
}
