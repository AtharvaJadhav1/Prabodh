import type { Metadata } from "next";
import Link from "next/link";
import LoginShell from "../../../components/login/LoginShell";
import RegisterForm from "../../../components/login/RegisterForm";

export const metadata: Metadata = {
  title: "Student Registration | Smart India Hackathon 2026 Portal",
  description: "Register as a student to form a SIH team, invite members and mentors, and select a problem statement.",
};

export default function RegisterPage() {
  return (
    <LoginShell>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-brand-muted">
        Already registered?{" "}
        <Link href="/login/student" className="font-semibold text-brand-primary hover:text-brand-hover">
          Sign in
        </Link>
      </p>
    </LoginShell>
  );
}
