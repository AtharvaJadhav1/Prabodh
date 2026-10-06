"use client";

import NotificationRuntime from "../chrome/NotificationRuntime";
import { AuthProvider } from "./AuthProvider";

export default function AuthProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <NotificationRuntime />
    </AuthProvider>
  );
}
