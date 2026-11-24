export const instant = false;

import { desc, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { retryYoutubeAction, youtubeAction } from "@/app/actions";
import { VideoReel } from "@/components/video-reel";
import { videos, youtubePublications } from "@/db/schema";
import { readError, requireViewer } from "@/lib/viewer";

export default async function VideoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db } = await requireViewer();
  const { id } = await params;
  const rows = await db.select().from(videos).orderBy(desc(videos.createdAt));
  const opened = rows.find((video) => video.id === id);
  if (!opened) notFound();
  const list = rows.filter((video) => video.status === "ready" || video.id === id);
  const limit = 40;
  const focus = list.findIndex((video) => video.id === id);
  let start = 0;
  let end = list.length;
  if (list.length > limit) {
    start = Math.max(0, focus - 12);
    end = Math.min(list.length, start + limit);
    start = Math.max(0, end - limit);
  }
  const window = list.slice(start, end);
  const openedAt = window.findIndex((video) => video.id === id);
  const ordered = [...window.slice(openedAt), ...window.slice(0, openedAt)];
  const ids = window.map((video) => video.id);
  const jobs = ids.length ? await db.select().from(youtubePublications).where(inArray(youtubePublications.videoId, ids)) : [];
  const error = await readError(searchParams);
  return (
    <div className="app-stage">
      <div className="app-screen app-screen-watch">
        <VideoReel
          start={0}
          error={error}
          youtubeAction={youtubeAction}
          retryYoutubeAction={retryYoutubeAction}
          slides={ordered.map((video) => ({
            id: video.id,
            title: video.title,
            status: video.status,
            thumbnailUrl: video.thumbnailUrl,
            tone: String([...video.id].reduce((total, char) => total + char.charCodeAt(0), 0) % 4),
            renditions: video.renditions ?? [],
            jobs: jobs
              .filter((job) => job.videoId === video.id)
              .map((job) => ({ id: job.id, destination: job.destination, status: job.status, externalId: job.externalId })),
          }))}
        />
      </div>
    </div>
  );
}
