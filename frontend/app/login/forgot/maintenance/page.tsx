import type { Metadata } from "next";
import MaintenanceCountdown from "@/components/login/MaintenanceCountdown";

export const metadata: Metadata = {
  title: { absolute: "Forgot password " },
  description: "Reset your Prabodh account password with a one-time email code.",
};

export default function ForgotPasswordMaintenancePage() {
  return <MaintenanceCountdown />;
}