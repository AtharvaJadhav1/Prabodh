import type { Metadata } from "next";
import LoginShell from "../../../components/login/LoginShell";
import ForgotPasswordForm from "../../../components/login/ForgotPasswordForm";

export const metadata: Metadata = {
  title: { absolute: "Forgot password " },
  description: "Reset your Prabodh account password with a one-time email code.",
};

export default function ForgotPasswordPage() {
  return (
    <LoginShell>
      <ForgotPasswordForm />
    </LoginShell>
  );
}
