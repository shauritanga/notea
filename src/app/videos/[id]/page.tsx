export const instant = false;

import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { retryYoutubeAction, youtubeAction } from "@/app/actions";
import { Player } from "@/components/player";
import { Choice, Note, Submit } from "@/components/ui";
import { videos, youtubePublications } from "@/db/schema";
import { readError, requireViewer } from "@/lib/viewer";

export default async function VideoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db } = await requireViewer();
  const { id } = await params;
  const [video] = await db.select().from(videos).where(eq(videos.id, id));
  if (!video) notFound();
  const jobs = await db.select().from(youtubePublications).where(eq(youtubePublications.videoId, id));
  const error = await readError(searchParams);
  const tone = String([...video.id].reduce((total, char) => total + char.charCodeAt(0), 0) % 4);
  return (
    <div className="app-stage">
      <div className="app-screen app-screen-watch">
        <div className="app-watch">
          <div className="app-watch-visual">
            {video.renditions?.length ? <Player title={video.title} renditions={video.renditions} poster={video.thumbnailUrl} fill /> : <div className="app-pitch" data-tone={tone} />}
            <Link className="app-watch-x" href="/" aria-label="Close">×</Link>
            <div className="app-watch-copy">
              <strong>{video.title}</strong>
              <p>{video.status}</p>
            </div>
          </div>
          <div className="app-watch-sheet">
            <Note>{error}</Note>
            <form className="grid gap-3" action={youtubeAction}>
              <input type="hidden" name="videoId" value={id} />
              <Choice label="YouTube destination" name="destination" options={["player_channel", "notea_official"]} />
              <Submit>Publish to YouTube</Submit>
            </form>
            {jobs.map((job) => (
              <p key={job.id} className="text-sm text-muted">
                {job.destination} · {job.status}
                {job.status === "failed" ? (
                  <form action={retryYoutubeAction}>
                    <input type="hidden" name="publicationId" value={job.id} />
                    <input type="hidden" name="videoId" value={id} />
                    <button className="text-sm font-semibold text-white" type="submit">Retry</button>
                  </form>
                ) : null}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
