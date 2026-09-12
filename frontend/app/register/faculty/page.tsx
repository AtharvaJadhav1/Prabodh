import type { Metadata } from "next";
import LoginShell from "../../../components/login/LoginShell";
import FacultyRegisterForm from "../../../components/login/FacultyRegisterForm";

export const metadata: Metadata = {
  title: "Mentor Registration | Smart India Hackathon 2026 Portal",
  description:
    "Register as an institute faculty mentor or industry mentor to receive team invitations from students.",
};

export default function FacultyRegisterPage() {
  return (
    <LoginShell>
      <FacultyRegisterForm />
    </LoginShell>
  );
}
