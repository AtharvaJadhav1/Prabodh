"use client";

import { useAuth } from "../auth/AuthProvider";
import { dashboardForRole } from "../../lib/session";
import LoginPasswordForm from "./LoginPasswordForm";

export default function FacultyForm() {
  const { establishSession } = useAuth();

  return (
    <div className="space-y-6">
      <LoginPasswordForm
        portal="faculty"
        title="Faculty & Evaluator Sign In"
        description="Sign in with your official university email. Admin, institute mentor, and industry mentor dashboards follow your account role."
        submitLabel="Sign in"
        onSuccess={(result) => {
          establishSession(result);
          window.location.assign(dashboardForRole(result.platformRole));
        }}
      />
      <p className="text-center text-sm text-brand-muted">
        New faculty member?{" "}
        <a href="/register/faculty" className="font-semibold text-brand-primary hover:text-brand-hover">
          Register here
        </a>
      </p>
    </div>
  );
}
