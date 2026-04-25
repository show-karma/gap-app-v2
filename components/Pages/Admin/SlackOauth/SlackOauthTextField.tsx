"use client";

/**
 * Small labeled input used across the Slack OAuth admin forms.
 * Lives in the feature folder — if another admin page needs it, lift
 * to `components/Utilities/` at that point (not before).
 */
export function SlackOauthTextField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: "text" | "password" | "email";
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-stone-600 dark:text-zinc-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 placeholder-stone-400 transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder-zinc-500"
      />
    </label>
  );
}
