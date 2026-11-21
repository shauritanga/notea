"use client";

import { useState } from "react";

export function IdentifierField({
  label,
  emailLabel,
  phoneLabel,
  emailPlaceholder,
  phonePlaceholder,
}: {
  label: string;
  emailLabel: string;
  phoneLabel: string;
  emailPlaceholder: string;
  phonePlaceholder: string;
}) {
  const [method, setMethod] = useState<"email" | "phone">("email");
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="app-lang">
        <button type="button" className={method === "email" ? "is-on" : ""} onClick={() => setMethod("email")}>
          {emailLabel}
        </button>
        <button type="button" className={method === "phone" ? "is-on" : ""} onClick={() => setMethod("phone")}>
          {phoneLabel}
        </button>
      </div>
      <input
        key={method}
        className="h-12 rounded-2xl border border-line bg-fill px-4 text-base font-normal text-ink outline-none focus:border-[var(--lime)]"
        name="identifier"
        type={method === "email" ? "email" : "tel"}
        inputMode={method === "email" ? "email" : "tel"}
        placeholder={method === "email" ? emailPlaceholder : phonePlaceholder}
        required
      />
    </div>
  );
}
