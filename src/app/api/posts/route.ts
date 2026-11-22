import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppError } from "@/domain/errors";
import { publishFromForm } from "@/lib/publish-post";
import { getViewer } from "@/lib/viewer";

export const instant = false;

export async function POST(request: Request) {
  await connection();
  const json = request.headers.get("accept")?.includes("application/json");
  const { db, user } = await getViewer();
  if (!user || user.status === "pending_verification" || !user.onboardedAt) {
    if (json) return Response.json({ error: "Sign in again" }, { status: 401 });
    redirect("/welcome");
  }
  try {
    await publishFromForm(db, user.id, await request.formData());
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Please try again";
    if (json) return Response.json({ error: message }, { status: 400 });
    redirect(`/compose?error=${encodeURIComponent(message)}`);
  }
  if (json) return Response.json({ ok: true });
  redirect("/");
}
