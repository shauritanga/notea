"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { selectRendition } from "@/domain/playback";
import { videoPlayback, type Rendition } from "@/domain/types";

export function Player({
  title,
  renditions,
  poster,
  fill = false,
}: {
  title: string;
  renditions: Rendition[];
  poster?: string | null;
  fill?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mbps, setMbps] = useState(5);
  const chosen = useMemo(() => {
    const match = selectRendition(renditions, mbps);
    if (!match) return match;
    const url = match.url.startsWith("/uploads/") ? match.url.split("?")[0] : match.url;
    return { ...match, url };
  }, [renditions, mbps]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => undefined);
  }, [chosen?.url]);
  if (!chosen) return null;
  return (
    <div className={fill ? "app-player-fill" : "grid gap-3"}>
      <video
        key={chosen.url}
        ref={videoRef}
        className={fill ? undefined : "aspect-video w-full rounded-3xl bg-pitch"}
        poster={poster ?? undefined}
        controls
        src={chosen.url}
        aria-label={title}
        autoPlay={videoPlayback.autoplay}
        playsInline={videoPlayback.playsInline}
      />
      <select className={fill ? "app-quality" : "h-12 rounded-2xl border border-line bg-fill px-4 text-ink"} value={String(mbps)} onChange={(event) => setMbps(Number(event.target.value))} aria-label={chosen.quality}>
        <option value="1">360p</option>
        <option value="5">720p</option>
      </select>
    </div>
  );
}
