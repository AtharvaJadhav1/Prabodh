"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TextField from "./TextField";

const roles = [
  {
    name: "Admin",
    desc: "Full platform management, mentor allocation, and nodal reporting.",
  },
  {
    name: "Mentor",
    desc: "Internal guide for academic tracking, weekly progress, and stage approvals.",
  },
  {
    name: "Industry Mentor",
    desc: "External expert for technical validation, architecture, and industry fit.",
  },
  {
    name: "Specialization Lead",
    desc: "Domain track supervision, cohort review, and evaluation panel oversight.",
  },
];

export default function FacultyForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">
          Faculty &amp; Evaluator Sign In
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
          Select your designated evaluation role to review stage rubrics and score projects.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="faculty-role" className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
          Select Designated Role
        </label>
        <select
          id="faculty-role"
          value={selectedRole.name}
          onChange={(e) => {
            const match = roles.find((r) => r.name === e.target.value);
            if (match) setSelectedRole(match);
          }}
          className="w-full appearance-none rounded-xl border border-brand-sand bg-white py-3 pl-4 pr-10 text-sm font-medium text-brand-charcoal shadow-sm transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
        >
          {roles.map((role) => (
            <option key={role.name} value={role.name}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      <form
        className="space-y-4 pt-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (selectedRole.name === "Mentor") {
            router.push("/dashboard/mentor");
          } else if (selectedRole.name === "Industry Mentor") {
            router.push("/dashboard/industry");
          } else if (selectedRole.name === "Admin") {
            router.push("/dashboard/admin");
          }
        }}
      >
        <TextField
          id="faculty-email"
          label="Official University Email / Faculty ID"
          type="email"
          placeholder="prof.name@mituniversity.edu.in"
          required
          autoComplete="username"
        />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="faculty-password"
              className="block text-xs font-bold uppercase tracking-wider text-brand-deep"
            >
              Security Password
            </label>
            <a href="#" className="text-xs font-semibold text-brand-primary transition-colors hover:text-brand-hover">
              Reset Credentials
            </a>
          </div>
          <div className="relative flex items-center">
            <input
              id="faculty-password"
              name="faculty-password"
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

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 transition-all duration-150 hover:bg-brand-hover active:scale-[0.99]"
        >
          Sign In as {selectedRole.name}
        </button>

        {selectedRole.name !== "Mentor" &&
          selectedRole.name !== "Industry Mentor" &&
          selectedRole.name !== "Admin" && (
          <p className="text-center text-xs text-brand-muted">
            {selectedRole.name} dashboard isn&apos;t available in this preview yet.
          </p>
        )}
      </form>
    </div>
  );
}