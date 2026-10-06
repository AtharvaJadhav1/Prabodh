import type { Metadata } from "next";
import LoginShell from "../../../components/login/LoginShell";
import RegisterForm from "../../../components/login/RegisterForm";

export const metadata: Metadata = {
  title: { absolute: "Register" },
  description: "Register as a student to join incubation projects, build teams, and access mentorship.",
};

export default function RegisterPage() {
  return (
    <LoginShell showPortalTabs={false}>
      <RegisterForm />
    </LoginShell>
  );
}
