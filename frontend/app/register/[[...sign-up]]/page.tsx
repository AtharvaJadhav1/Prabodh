import type { Metadata } from "next";
import LoginShell from "../../../components/login/LoginShell";
import RegisterForm from "../../../components/login/RegisterForm";

export const metadata: Metadata = {
  title: { absolute: "Student Registration " },
  description: "Register as a student to form a SIH team, invite members and mentors, and select a problem statement.",
};

export default function RegisterPage() {
  return (
    <LoginShell showPortalTabs={false}>
      <RegisterForm />
    </LoginShell>
  );
}
