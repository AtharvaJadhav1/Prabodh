import type { Metadata } from "next";
import LoginShell from "../../../components/login/LoginShell";
import StudentForm from "../../../components/login/StudentForm";

export const metadata: Metadata = {
  title: { absolute: "Student Login | Prabodh Incubation Portal 2026" },
  description:
    "Student Team Sign In — enter your PRN/Enrollment credentials to access team formation, milestone gates, and mentor feedback across incubation tracks.",
};

export default function StudentLoginPage() {
  return (
    <LoginShell>
      <StudentForm />
    </LoginShell>
  );
}