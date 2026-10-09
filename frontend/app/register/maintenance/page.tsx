import type { Metadata } from "next";
import MaintenanceCountdown from "@/components/login/MaintenanceCountdown";

export const metadata: Metadata = {
  title: { absolute: "Register" },
  description: "Register as a student to join incubation projects, build teams, and access mentorship.",
};

export default function RegisterMaintenancePage() {
  return <MaintenanceCountdown />;
}