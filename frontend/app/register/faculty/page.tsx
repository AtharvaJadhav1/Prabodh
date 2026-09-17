import { redirect } from "next/navigation";

export default function FacultyRegisterPage() {
  redirect("/login?notice=faculty-invite-only");
}
