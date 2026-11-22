"use client";

import { useEffect, useState } from "react";

const RESEND_WAIT_MS = 60_000;

function clock(ms: number) {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function VerifyTimer({
  serverNow,
  sentAt,
  expiresAt,
  expiresLabel,
  expiredLabel,
  resendLabel,
  resendInLabel,
  action,
}: {
  serverNow: number;
  sentAt: number;
  expiresAt: number;
  expiresLabel: string;
  expiredLabel: string;
  resendLabel: string;
  resendInLabel: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, expiresAt - now);
  const wait = Math.max(0, sentAt + RESEND_WAIT_MS - now);
  const expired = expiresAt === 0 || left === 0;
  const canResend = expired || wait === 0;
  return (
    <div className="grid gap-3">
      <p className={expired ? "app-timer is-expired" : "app-timer"} role="timer" aria-live="polite">
        <span>{expired ? expiredLabel : expiresLabel}</span>
        <strong>{clock(left)}</strong>
      </p>
      <form action={action}>
        <button className="app-resend" type="submit" disabled={!canResend}>
          {canResend ? resendLabel : `${resendInLabel} ${clock(wait)}`}
        </button>
      </form>
    </div>
  );
}
