import type { Metadata } from "next";
import Link from "next/link";
import LoginShell from "../../../components/login/LoginShell";
import FacultyRegisterForm from "../../../components/login/FacultyRegisterForm";

export const metadata: Metadata = {
  title: "Faculty Registration | Smart India Hackathon 2026 Portal",
  description: "Register as faculty or institute mentor to receive team invitations from students.",
};

export default function FacultyRegisterPage() {
  return (
    <LoginShell>
      <FacultyRegisterForm />
      <p className="mt-6 text-center text-sm text-brand-muted">
        Student registration?{" "}
        <Link href="/register" className="font-semibold text-brand-primary hover:text-brand-hover">
          Register as student
        </Link>
      </p>
    </LoginShell>
  );
}
