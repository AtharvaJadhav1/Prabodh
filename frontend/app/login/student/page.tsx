import type { Metadata } from "next";
import LoginShell from "../../../components/login/LoginShell";
import StudentForm from "../../../components/login/StudentForm";

export const metadata: Metadata = {
  title: "Student Login | Smart India Hackathon 2026 Portal | MIT-ADT University",
  description:
    "Student Team Sign In — enter your PRN/Enrollment credentials to access team formation, milestone gates, and mentor feedback for SIH 2026.",
};

export default function StudentLoginPage() {
  return (
    <LoginShell>
      <StudentForm />
    </LoginShell>
  );
}