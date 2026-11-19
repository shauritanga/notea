import type { Rendition } from "@/domain/types";

export function selectRendition(renditions: Rendition[], downlinkMbps: number) {
  const budget = downlinkMbps * 1_000_000;
  const sorted = [...renditions].sort((a, b) => a.bitrate - b.bitrate);
  const fit = [...sorted].reverse().find((rendition) => rendition.bitrate <= budget);
  return fit ?? sorted[0];
}
