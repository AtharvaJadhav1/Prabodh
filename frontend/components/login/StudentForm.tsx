"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STUDENT_ROLE_KEY, studentRoles, type StudentRole } from "../../data/studentDashboard";
import TextField from "./TextField";

export default function StudentForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<StudentRole>("Team Member");
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">
          Student Team Sign In
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
          Enter your PRN/Enrollment credentials to access team formation, milestone gates, and mentor feedback.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="student-role" className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
          Select Your Team Role
        </label>
        <select
          id="student-role"
          value={selectedRole}
          onChange={(e) => {
            const match = studentRoles.find((r) => r.name === e.target.value);
            if (match) setSelectedRole(match.name);
          }}
          className="w-full appearance-none rounded-xl border border-brand-sand bg-white py-3 pl-4 pr-10 text-sm font-medium text-brand-charcoal shadow-sm transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
        >
          {studentRoles.map((role) => (
            <option key={role.name} value={role.name}>
              {role.name}
            </option>
          ))}
        </select>
        <p className="rounded-xl bg-brand-surface px-3 py-2 text-xs leading-relaxed text-brand-muted">
          {studentRoles.find((r) => r.name === selectedRole)?.desc}
        </p>
      </div>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            window.localStorage.setItem(STUDENT_ROLE_KEY, selectedRole);
          } catch {
            /* ignore storage access errors */
          }
          router.push("/dashboard/student");
        }}
      >
        <TextField
          id="student-prn"
          label="Enrollment / PRN Number"
          type="text"
          placeholder="e.g. MITU22BTCS0412"
          required
          autoComplete="username"
        />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="student-password"
              className="block text-xs font-bold uppercase tracking-wider text-brand-deep"
            >
              Password
            </label>
            <a href="#" className="text-xs font-semibold text-brand-primary transition-colors hover:text-brand-hover">
              Forgot Password?
            </a>
          </div>
          <div className="relative flex items-center">
            <input
              id="student-password"
              name="student-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-brand-sand bg-white py-3 pl-4 pr-16 text-sm font-medium text-brand-charcoal shadow-sm transition-all placeholder:text-brand-charcoal/50 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 rounded p-1 text-xs font-semibold text-brand-muted transition-colors hover:text-brand-deep"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-brand-sand bg-white text-brand-primary focus:ring-brand-primary"
            />
            <span className="text-xs font-medium text-brand-muted">Remember PRN on this browser</span>
          </label>
        </div>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 transition-all duration-150 hover:bg-brand-hover active:scale-[0.99]"
        >
          Sign In to Student Workspace
        </button>

        <div className="flex items-start gap-2.5 rounded-xl border border-brand-amber/25 bg-brand-amber/10 p-3 text-xs text-brand-deep">
          <p className="leading-relaxed">
            <strong className="font-bold">Role-based access:</strong> As a Team Leading your PRN is
            authorized for PS selection, mentor invites, and group management. Members get read-only
            team/PS/mentor views.
          </p>
        </div>
      </form>
    </div>
  );
}