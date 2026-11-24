"use client";

import Link from "next/link";
import { Player } from "@/components/player";
import { SnapReel } from "@/components/snap";
import type { Rendition } from "@/domain/types";

type Action = (formData: FormData) => void | Promise<void>;

type VideoSlide = {
  id: string;
  title: string;
  status: string;
  thumbnailUrl: string | null;
  tone: string;
  renditions: Rendition[];
  jobs: Array<{ id: string; destination: string; status: string; externalId: string | null }>;
};

export function VideoReel({
  slides,
  start,
  error,
  youtubeAction,
  retryYoutubeAction,
}: {
  slides: VideoSlide[];
  start: number;
  error: string;
  youtubeAction: Action;
  retryYoutubeAction: Action;
}) {
  return (
    <SnapReel start={start} count={slides.length} label="Videos" hrefs={slides.map((slide) => `/videos/${slide.id}`)}>
      {(active) =>
        slides.map((slide, index) => (
          <div key={slide.id} className="app-reel-slide" data-index={index} inert={index === active ? undefined : true}>
            <div className="app-watch">
              <div className="app-watch-visual">
                {index === active && slide.renditions.length ? (
                  <Player title={slide.title} renditions={slide.renditions} poster={slide.thumbnailUrl} fill />
                ) : slide.thumbnailUrl ? (
                  <img src={slide.thumbnailUrl} alt="" />
                ) : (
                  <div className="app-pitch" data-tone={slide.tone} />
                )}
                <Link className="app-watch-x" href="/" aria-label="Close">×</Link>
                <div className="app-watch-copy">
                  <strong>{slide.title}</strong>
                  <p>{slide.status}</p>
                </div>
              </div>
              <div className="app-watch-sheet">
                {index === start && error ? <p className="rounded-2xl bg-warn-bg px-4 py-3 text-sm leading-6 text-warn-ink">{error}</p> : null}
                <form className="grid gap-3" action={youtubeAction}>
                  <input type="hidden" name="videoId" value={slide.id} />
                  <label className="grid gap-2 text-sm font-medium">
                    YouTube destination
                    <select className="h-12 rounded-2xl border border-line bg-fill px-4 text-base font-normal text-ink" name="destination" defaultValue="player_channel">
                      <option value="player_channel">player channel</option>
                      <option value="notea_official">notea official</option>
                    </select>
                  </label>
                  <button className="h-12 rounded-full bg-[var(--lime)] px-5 text-base font-semibold text-on-lime" type="submit">
                    Publish to YouTube
                  </button>
                </form>
                {slide.jobs.map((job) => (
                  <p key={job.id} className="text-sm text-muted">
                    {job.destination} · {job.status}
                    {job.status === "published" && job.externalId && !job.externalId.startsWith("yt_") ? (
                      <>
                        {" · "}
                        <a className="font-semibold text-white" href={`https://www.youtube.com/watch?v=${job.externalId}`}>Watch on YouTube</a>
                      </>
                    ) : null}
                    {job.status === "failed" ? (
                      <form action={retryYoutubeAction}>
                        <input type="hidden" name="publicationId" value={job.id} />
                        <input type="hidden" name="videoId" value={slide.id} />
                        <button className="text-sm font-semibold text-white" type="submit">Retry</button>
                      </form>
                    ) : null}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))
      }
    </SnapReel>
  );
}
