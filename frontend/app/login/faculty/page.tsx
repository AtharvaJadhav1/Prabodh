import type { Metadata } from "next";
import LoginShell from "../../../components/login/LoginShell";
import FacultyForm from "../../../components/login/FacultyForm";

export const metadata: Metadata = {
  title: "Faculty & Evaluator Login | Prabodh Incubation Portal 2026",
  description:
    "Faculty & Evaluator Console — select your designated role to review stage rubrics, mentor teams, and score projects across incubation tracks.",
};

export default function FacultyLoginPage() {
  return (
    <LoginShell>
      <FacultyForm />
    </LoginShell>
  );
}