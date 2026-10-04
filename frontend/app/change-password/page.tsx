import type { Metadata } from "next";
import LoginShell from "../../components/login/LoginShell";
import ChangePasswordForm from "../../components/login/ChangePasswordForm";

export const metadata: Metadata = {
  title: { absolute: "Change password" },
  description: "Choose your own password to finish setting up your Prabodh account.",
  robots: { index: false },
};

export default function ChangePasswordPage() {
  return (
    <LoginShell showPortalTabs={false}>
      <ChangePasswordForm />
    </LoginShell>
  );
}
