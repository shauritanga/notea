export const instant = false;

import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { retryYoutubeAction, youtubeAction } from "@/app/actions";
import { Player } from "@/components/player";
import { Card, Choice, Note, Quiet, Shell, Stack, Submit, Title } from "@/components/ui";
import { videos, youtubePublications } from "@/db/schema";
import { readError, requireViewer } from "@/lib/viewer";

export default async function VideoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db, lang } = await requireViewer();
  const { id } = await params;
  const [video] = await db.select().from(videos).where(eq(videos.id, id));
  if (!video) notFound();
  const jobs = await db.select().from(youtubePublications).where(eq(youtubePublications.videoId, id));
  const error = await readError(searchParams);
  return (
    <Shell lang={lang}>
      <Title>{video.title}</Title>
      <Quiet>{video.status}</Quiet>
      {video.renditions?.length ? <Player title={video.title} renditions={video.renditions} poster={video.thumbnailUrl} /> : null}
      {video.thumbnailUrl ? <img className="w-40 rounded-2xl" src={video.thumbnailUrl} alt="" /> : null}
      <Note>{error}</Note>
      <form className="grid gap-3" action={youtubeAction}>
        <input type="hidden" name="videoId" value={id} />
        <Choice label="YouTube destination" name="destination" options={["player_channel", "notea_official"]} />
        <Submit>Publish to YouTube</Submit>
      </form>
      <Stack>
        {jobs.map((job) => (
          <Card key={job.id}>
            <strong>{job.destination}</strong>
            <Quiet>{job.status} · attempts {job.attempts}</Quiet>
            {job.externalId ? <Quiet>{job.externalId}</Quiet> : null}
            {job.error ? <Quiet>{job.error}</Quiet> : null}
            {job.status === "failed" ? (
              <form action={retryYoutubeAction}>
                <input type="hidden" name="publicationId" value={job.id} />
                <input type="hidden" name="videoId" value={id} />
                <button className="text-sm font-semibold" type="submit">Retry</button>
              </form>
            ) : null}
          </Card>
        ))}
      </Stack>
    </Shell>
  );
}
