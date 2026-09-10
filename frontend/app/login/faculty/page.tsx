import type { Metadata } from "next";
import LoginShell from "../../../components/login/LoginShell";
import FacultyForm from "../../../components/login/FacultyForm";

export const metadata: Metadata = {
  title: "Faculty & Evaluator Login | Smart India Hackathon 2026 Portal | MIT-ADT University",
  description:
    "Faculty & Evaluator Console — select your designated role to review stage rubrics, mentor teams, and score SIH 2026 projects.",
};

export default function FacultyLoginPage() {
  return (
    <LoginShell>
      <FacultyForm />
    </LoginShell>
  );
}