export const instant = false;

import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { highlightAction, shortlistAddAction } from "@/app/actions";
import { FollowButton } from "@/components/post";
import { Card, Field, Note, Quiet, Shell, Stack, Submit, Title, Trust } from "@/components/ui";
import { profiles, shortlists } from "@/db/schema";
import { publicProfile } from "@/domain/accounts";
import { listHighlights } from "@/domain/talent";
import { readError, requireViewer } from "@/lib/viewer";

export default async function PlayerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db, user, lang } = await requireViewer();
  const { id } = await params;
  const profile = await publicProfile(db, id, user.id);
  if (!profile) notFound();
  const highlights = await listHighlights(db, id);
  const mine = await db.select().from(shortlists);
  const scout = await db.select().from(profiles).where(and(eq(profiles.userId, user.id), eq(profiles.type, "scout")));
  const lists = mine.filter((list) => scout.some((item) => item.id === list.scoutProfileId));
  const error = await readError(searchParams);
  return (
    <Shell lang={lang}>
      <Title>{profile.displayName}</Title>
      <Trust verified={profile.verified} lang={lang} />
      <Quiet>{profile.selfReported ? "Self-reported information" : "Verified information"}</Quiet>
      <Quiet>{[profile.position, profile.preferredFoot, profile.region, profile.level, profile.section].filter(Boolean).join(" · ")}</Quiet>
      <p className="leading-7">{profile.bio}</p>
      {profile.footballHistory ? <p>{profile.footballHistory}</p> : null}
      {profile.achievements ? <p>{profile.achievements}</p> : null}
      <FollowButton lang={lang} targetType="profile" targetId={profile.id} back={`/players/${id}`} />
      <Note>{error}</Note>
      <Stack>
        {highlights.map((highlight) => (
          <Card key={highlight.id}>
            <strong>{highlight.title}</strong>
            <Quiet>{highlight.verified ? "Verified highlight" : "Self-reported highlight"}</Quiet>
          </Card>
        ))}
      </Stack>
      {profile.userId === user.id && profile.type === "player" ? (
        <form className="grid gap-3" action={highlightAction}>
          <input type="hidden" name="back" value={`/players/${id}`} />
          <Field label="Highlight" name="title" required />
          <Field label="Video address" name="videoUrl" />
          <Submit>Add highlight</Submit>
        </form>
      ) : null}
      {lists.length > 0 ? (
        <form className="grid gap-3" action={shortlistAddAction}>
          <input type="hidden" name="playerProfileId" value={profile.id} />
          <input type="hidden" name="back" value={`/players/${id}`} />
          <select className="h-12 rounded-2xl border border-line px-4" name="shortlistId">
            {lists.map((list) => (
              <option key={list.id} value={list.id}>{list.name}</option>
            ))}
          </select>
          <Submit>Add to shortlist</Submit>
        </form>
      ) : null}
    </Shell>
  );
}
