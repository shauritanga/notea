"use client";

import { useMemo, useState } from "react";
import { selectRendition } from "@/domain/playback";
import { videoPlayback, type Rendition } from "@/domain/types";

export function Player({
  title,
  renditions,
  poster,
}: {
  title: string;
  renditions: Rendition[];
  poster?: string | null;
}) {
  const [mbps, setMbps] = useState(5);
  const chosen = useMemo(() => selectRendition(renditions, mbps), [renditions, mbps]);
  if (!chosen) return null;
  return (
    <div className="grid gap-3">
      <video
        key={chosen.url}
        className="aspect-video w-full rounded-3xl bg-pitch"
        poster={poster ?? undefined}
        controls
        src={chosen.url}
        aria-label={title}
        {...videoPlayback}
      />
      <label className="grid gap-2 text-sm text-muted">
        {chosen.quality}
        <select className="h-12 rounded-2xl border border-line bg-white px-4 text-ink" value={String(mbps)} onChange={(event) => setMbps(Number(event.target.value))}>
          <option value="1">360p</option>
          <option value="5">720p</option>
        </select>
      </label>
    </div>
  );
}
