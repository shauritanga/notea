export const instant = false;

import { readAlertsAction } from "@/app/actions";
import { Card, Quiet, Shell, Stack, Submit, Title } from "@/components/ui";
import { listNotifications } from "@/domain/notify";
import { requireViewer } from "@/lib/viewer";

export default async function NotificationsPage() {
  const { db, user, lang } = await requireViewer();
  const notes = await listNotifications(db, user.id);
  return (
    <Shell lang={lang}>
      <Title>Arifa</Title>
      <form action={readAlertsAction}>
        <Submit>Mark read</Submit>
      </form>
      <Stack>
        {notes.length === 0 ? <Quiet>No alerts.</Quiet> : null}
        {notes.map((note) => (
          <Card key={note.id}>
            <div className="flex items-center justify-between">
              <strong>{note.title}</strong>
              <span className="text-xs uppercase text-muted">{note.type}</span>
            </div>
            <p className="leading-6">{note.body}</p>
            {note.readAt ? null : <span className="text-xs text-grass">New</span>}
          </Card>
        ))}
      </Stack>
    </Shell>
  );
}
