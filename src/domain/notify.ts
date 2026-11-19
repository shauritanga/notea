import { desc, eq } from "drizzle-orm";
import { notifications, users } from "@/db/schema";
import type { Database } from "@/domain/db";
import { newId } from "@/domain/crypto";
import type { NotificationPrefs } from "@/domain/types";

export type NotificationType = keyof NotificationPrefs;

export async function notify(
  db: Database,
  input: { userId: string; type: NotificationType; title: string; body: string },
) {
  const [user] = await db.select().from(users).where(eq(users.id, input.userId));
  if (!user) return;
  const prefs = user.notificationPrefs;
  if (prefs?.[input.type] === false) return;
  await db.insert(notifications).values({
    id: newId(),
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    createdAt: new Date(),
  });
}

export async function listNotifications(db: Database, userId: string) {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
}
