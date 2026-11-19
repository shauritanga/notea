import "server-only";
import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { ready } from "@/db/client";
import { userFromToken } from "@/domain/accounts";
import { AppError } from "@/domain/errors";
import type { Lang } from "@/i18n/messages";

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export async function getViewer() {
  await connection();
  const db = await ready();
  const jar = await cookies();
  const token = jar.get("notea_session")?.value;
  const user = token ? await userFromToken(db, token) : null;
  const preferred = user?.language ?? jar.get("notea_lang")?.value;
  const lang = (preferred === "en" ? "en" : "sw") as Lang;
  const devCode = jar.get("notea_dev_code")?.value ?? "";
  return { db, user, lang, devCode };
}

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer.user) redirect("/welcome");
  if (viewer.user.status === "pending_verification") redirect("/verify");
  if (!viewer.user.onboardedAt) redirect("/onboarding");
  return { ...viewer, user: viewer.user };
}

export async function setSession(token: string) {
  const jar = await cookies();
  jar.set("notea_session", token, { ...base, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete("notea_session");
}

export async function rememberCode(code: string) {
  if (process.env.NOTEA_SHOW_CODES !== "1" || !code) return;
  const jar = await cookies();
  jar.set("notea_dev_code", code, { ...base, maxAge: 600 });
}

export function fail(path: string, error: unknown): never {
  unstable_rethrow(error);
  const message = error instanceof AppError ? error.message : "Please try again";
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

export async function readError(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const params = await searchParams;
  return typeof params.error === "string" ? params.error : "";
}
