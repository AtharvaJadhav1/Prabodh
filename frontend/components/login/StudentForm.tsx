"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";
import { dashboardForRole } from "../../lib/session";
import OtpAuthFlow from "./OtpAuthFlow";

export default function StudentForm() {
  const router = useRouter();
  const { establishSession } = useAuth();

  return (
    <div className="space-y-6">
    <OtpAuthFlow
      purpose="login"
      title="Student Team Sign In"
      description="Enter your institutional email. We will send a one-time verification code — check inbox and spam."
      submitLabel="Sign in to student workspace"
      onSuccess={(result) => {
        establishSession(result);
        router.push(
          result.platformRole === "student"
            ? "/dashboard/student"
            : dashboardForRole(result.platformRole as never),
        );
      }}
    />
    <p className="text-center text-sm text-brand-muted">
      New to the portal?{" "}
      <a href="/register" className="font-semibold text-brand-primary hover:text-brand-hover">
        Create a student account
      </a>
    </p>
    </div>
  );
}

