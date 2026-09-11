import type { ReactNode } from "react";

type TextFieldProps = {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric";
  pattern?: string;
  maxLength?: number;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  trailing?: ReactNode;
};

export default function TextField({
  id,
  label,
  type = "text",
  placeholder,
  required,
  autoComplete,
  inputMode,
  pattern,
  maxLength,
  value,
  onChange,
  trailing,
}: TextFieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-bold uppercase tracking-wider text-brand-deep"
      >
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          name={id}
          type={type}
          required={required}
          placeholder={placeholder}
          inputMode={inputMode}
          pattern={pattern}
          maxLength={maxLength}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={`w-full rounded-xl border border-brand-sand bg-white py-3 text-sm font-medium text-brand-charcoal shadow-sm transition-all placeholder:text-brand-charcoal/50 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 ${
            trailing ? "pr-16" : "pr-4"
          } pl-4 outline-none`}
        />
        {trailing && (
          <div className="absolute right-3.5 flex items-center">{trailing}</div>
        )}
      </div>
    </div>
  );
}