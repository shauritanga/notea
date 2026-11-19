export const instant = false;

import { and, eq } from "drizzle-orm";
import { shortlistAction } from "@/app/actions";
import { Card, Field, Note, Quiet, Shell, Stack, Submit, Title } from "@/components/ui";
import { profiles, shortlistItems, shortlists } from "@/db/schema";
import { readError, requireViewer } from "@/lib/viewer";

export default async function ShortlistsPage({ searchParams }: PageProps<"/">) {
  const { db, user, lang } = await requireViewer();
  const scout = await db.select().from(profiles).where(and(eq(profiles.userId, user.id), eq(profiles.type, "scout")));
  const lists = scout.length ? await db.select().from(shortlists).where(eq(shortlists.scoutProfileId, scout[0].id)) : [];
  const items = lists.length ? await db.select().from(shortlistItems) : [];
  const error = await readError(searchParams);
  return (
    <Shell lang={lang}>
      <Title>Shortlists</Title>
      <Note>{error}</Note>
      {scout.length === 0 ? <Quiet>Add a scout profile from You before keeping a shortlist.</Quiet> : null}
      <form className="grid gap-3" action={shortlistAction}>
        <Field label="Name" name="name" required />
        <Submit>Create shortlist</Submit>
      </form>
      <Stack>
        {lists.map((list) => (
          <Card key={list.id}>
            <strong>{list.name}</strong>
            <Quiet>{items.filter((item) => item.shortlistId === list.id).length} players</Quiet>
          </Card>
        ))}
      </Stack>
    </Shell>
  );
}
