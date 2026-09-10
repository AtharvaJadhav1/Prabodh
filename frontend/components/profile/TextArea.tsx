type TextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
};

export default function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  required,
  maxLength,
}: TextAreaProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
        {label}
        {required && <span className="text-brand-primary"> *</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className="w-full resize-none rounded-xl border border-brand-sand bg-white px-4 py-2.5 text-sm font-medium text-brand-charcoal shadow-sm transition-all placeholder:text-brand-charcoal/50 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
      />
    </div>
  );
}