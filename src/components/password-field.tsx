"use client";

import { useState } from "react";

export function PasswordField({
  label,
  name,
  required = false,
  placeholder = "",
  showLabel,
  hideLabel,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  showLabel: string;
  hideLabel: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <span className="app-password">
        <input
          className="h-12 w-full rounded-2xl border border-line bg-[#171c18] px-4 text-base font-normal text-white outline-none focus:border-[var(--lime)]"
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          placeholder={placeholder}
          autoComplete="current-password"
        />
        <button
          type="button"
          className="app-password-toggle"
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </span>
    </label>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a16.3 16.3 0 0 1-3.6 4.4M6.7 6.7C4 8.5 2 12 2 12s3.5 7 10 7c1.4 0 2.6-.2 3.7-.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
