import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { profiles, videos, youtubePublications } from "@/db/schema";
import { assertAccount, assertPlatform, audit } from "@/domain/access";
import { hashToken, newId } from "@/domain/crypto";
import type { Database } from "@/domain/db";
import { AppError } from "@/domain/errors";
import { notify } from "@/domain/notify";
import type { Rendition } from "@/domain/types";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type VideoFile = { bytes: Uint8Array; contentType: string };

const VIDEO_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

export type YouTubePublishInput = {
  title: string;
  description: string;
  sourceUrl: string;
  destination: "notea_official" | "player_channel";
};

export interface YouTubePublisher {
  publish(input: YouTubePublishInput): Promise<{ externalId: string }>;
}

export class SimulatedYouTubePublisher implements YouTubePublisher {
  async publish(input: YouTubePublishInput) {
    if (input.title.includes("[fail]")) throw new Error("YouTube rejected the upload");
    return { externalId: `yt_${hashToken(input.title).slice(0, 12)}` };
  }
}

export class GoogleYouTubePublisher implements YouTubePublisher {
  constructor(
    private readonly options: {
      accessToken?: string;
      credentials?: { clientId: string; clientSecret: string; refreshToken: string };
      fetchImpl?: FetchLike;
      loadMedia?: (sourceUrl: string) => Promise<VideoFile>;
    },
  ) {}

  async publish(input: YouTubePublishInput) {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const accessToken = this.options.accessToken ?? (await refreshYouTubeAccessToken({ ...this.credentials(), fetchImpl }));
    const media = await (this.options.loadMedia ?? readStoredVideo)(input.sourceUrl);
    const started = await fetchImpl("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json; charset=UTF-8",
        "x-upload-content-length": String(media.bytes.byteLength),
        "x-upload-content-type": media.contentType,
      },
      body: JSON.stringify({
        snippet: {
          title: input.title.trim().slice(0, 100) || "Notea",
          description: input.description.trim().slice(0, 5000),
          categoryId: "17",
        },
        status: { privacyStatus: "public" },
      }),
    });
    if (!started.ok) await rejectYouTube(started);
    const location = started.headers.get("location");
    if (!location) throw new Error("YouTube did not return an upload URL");
    const uploaded = await fetchImpl(location, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-length": String(media.bytes.byteLength),
        "content-type": media.contentType,
      },
      body: new Blob([Buffer.from(media.bytes)], { type: media.contentType }),
    });
    if (!uploaded.ok) await rejectYouTube(uploaded);
    const json = (await uploaded.json()) as { id?: string };
    if (!json.id) throw new Error("YouTube did not return a video id");
    return { externalId: json.id };
  }

  private credentials() {
    const credentials = this.options.credentials;
    if (!credentials?.clientId || !credentials.clientSecret || !credentials.refreshToken) {
      throw new Error("YouTube is not configured");
    }
    return credentials;
  }
}

export function officialYouTubePublisher(): YouTubePublisher | null {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  return new GoogleYouTubePublisher({ credentials: { clientId, clientSecret, refreshToken } });
}

export async function readStoredVideo(sourceUrl: string): Promise<VideoFile> {
  const pathname = uploadPath(sourceUrl);
  const root = path.join(process.cwd(), "public", "uploads");
  const filePath = path.resolve(root, pathname);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) throw new Error("Video file is not on this server");
  let bytes: Buffer;
  try {
    bytes = await readFile(filePath);
  } catch {
    throw new Error("Video file is not on this server");
  }
  if (bytes.byteLength === 0) throw new Error("Video file is empty");
  return { bytes, contentType: VIDEO_TYPES[path.extname(filePath).toLowerCase()] ?? "video/mp4" };
}

function uploadPath(sourceUrl: string) {
  let pathname = sourceUrl;
  if (sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://")) {
    try {
      pathname = new URL(sourceUrl).pathname;
    } catch {
      throw new Error("Video file is not on this server");
    }
  }
  if (!pathname.startsWith("/uploads/")) throw new Error("Video file is not on this server");
  const relative = decodeURIComponent(pathname.slice("/uploads/".length));
  if (!relative || relative.includes("..") || path.isAbsolute(relative)) throw new Error("Video file is not on this server");
  return relative;
}

async function refreshYouTubeAccessToken(options: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fetchImpl: FetchLike;
}) {
  const response = await options.fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: options.clientId,
      client_secret: options.clientSecret,
      refresh_token: options.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) await rejectYouTube(response);
  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("YouTube authorization expired");
  return json.access_token;
}

async function rejectYouTube(response: Response): Promise<never> {
  const text = await response.text();
  let message = "YouTube rejected the upload";
  try {
    const json = JSON.parse(text) as { error?: { message?: string } | string; error_description?: string };
    if (typeof json.error === "string") message = json.error_description || json.error;
    else if (json.error?.message) message = json.error.message;
  } catch {
    if (text && text.length < 180 && !text.includes("<")) message = text;
  }
  throw new Error(message.slice(0, 300));
}

export { selectRendition } from "@/domain/playback";

const MAX_ATTEMPTS = 3;

export async function uploadVideo(
  db: Database,
  actorId: string,
  input: { title: string; sourceUrl: string; profileId?: string; thumbnailUrl?: string },
) {
  await assertAccount(db, actorId, "write");
  if (!input.sourceUrl.trim() || !input.title.trim()) throw new AppError("video_required", "Add a title and a video");
  const contentHash = hashToken(input.sourceUrl.trim());
  const [existing] = await db.select().from(videos).where(eq(videos.contentHash, contentHash));
  if (existing) return existing;
  const id = newId();
  await db.insert(videos).values({
    id,
    ownerUserId: actorId,
    profileId: input.profileId ?? null,
    title: input.title.trim(),
    sourceUrl: input.sourceUrl.trim(),
    thumbnailUrl: input.thumbnailUrl ?? null,
    contentHash,
    status: "processing",
    renditions: [],
    createdAt: new Date(),
  });
  return processVideo(db, id);
}

export async function processVideo(db: Database, videoId: string) {
  const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
  if (!video) throw new AppError("not_found", "Video not found");
  if (!video.sourceUrl) {
    await db.update(videos).set({ status: "failed" }).where(eq(videos.id, videoId));
    return { ...(await reload(db, videoId)), svg: "" };
  }
  const renditions: Rendition[] = [
    { quality: "360p", bitrate: 800_000, url: video.sourceUrl },
    { quality: "720p", bitrate: 2_500_000, url: video.sourceUrl },
  ];
  const thumbnailUrl = video.thumbnailUrl || `/uploads/thumbs/${video.id}.svg`;
  await db.update(videos).set({ status: "ready", thumbnailUrl, renditions }).where(eq(videos.id, videoId));
  const svg = video.thumbnailUrl
    ? ""
    : `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="100%" height="100%" fill="#0f3d2e"/><text x="64" y="360" fill="#f6f3ec" font-size="48">${escapeXml(video.title)}</text></svg>`;
  return { ...(await reload(db, videoId)), svg };
}

function escapeXml(value: string) {
  return value.replace(/[<>&"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[char] ?? char);
}

async function reload(db: Database, videoId: string) {
  const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
  return video;
}

export async function authorizePlayerYouTube(db: Database, actorId: string, profileId: string) {
  await assertPlatform(db, actorId, "youtube.authorize_player");
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId));
  if (!profile || profile.type !== "player") throw new AppError("player_required", "Authorize a player profile");
  await db.update(profiles).set({ youtubeAuthorized: true }).where(eq(profiles.id, profileId));
  await audit(db, actorId, "youtube.player_authorized", "profile", profileId);
}

export async function publishToYouTube(
  db: Database,
  actorId: string,
  input: { videoId: string; destination: "notea_official" | "player_channel" },
  publisher: YouTubePublisher = new SimulatedYouTubePublisher(),
) {
  await assertAccount(db, actorId, "write");
  const video = await reload(db, input.videoId);
  if (!video || video.status !== "ready") throw new AppError("not_ready", "The video is not ready to publish");
  if (video.ownerUserId !== actorId) {
    await assertPlatform(db, actorId, "youtube.manage");
  }
  if (input.destination === "notea_official") await assertPlatform(db, actorId, "youtube.manage");
  if (input.destination === "player_channel") {
    if (!video.profileId) throw new AppError("player_required", "Choose a player profile for this video");
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, video.profileId));
    if (!profile?.youtubeAuthorized) throw new AppError("not_authorized", "This player is not authorized for YouTube");
  }
  return beginPublication(db, video, input.destination, publisher);
}

export async function mirrorToOfficialYouTube(db: Database, actorId: string, videoId: string, publisher: YouTubePublisher) {
  await assertAccount(db, actorId, "write");
  const video = await reload(db, videoId);
  if (!video || video.status !== "ready") throw new AppError("not_ready", "The video is not ready to publish");
  if (video.ownerUserId !== actorId) await assertPlatform(db, actorId, "youtube.manage");
  return beginPublication(db, video, "notea_official", publisher);
}

async function beginPublication(
  db: Database,
  video: NonNullable<Awaited<ReturnType<typeof reload>>>,
  destination: "notea_official" | "player_channel",
  publisher: YouTubePublisher,
) {
  const duplicate = await db
    .select()
    .from(youtubePublications)
    .where(and(eq(youtubePublications.contentHash, video.contentHash), eq(youtubePublications.destination, destination)));
  const blocking = duplicate.find((row) => row.status === "published" || row.status === "processing" || row.status === "queued");
  if (blocking) return blocking;
  const id = newId();
  await db.insert(youtubePublications).values({
    id,
    videoId: video.id,
    destination,
    status: "processing",
    attempts: 1,
    contentHash: video.contentHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return runPublication(db, id, publisher);
}

async function runPublication(db: Database, publicationId: string, publisher: YouTubePublisher) {
  const [publication] = await db.select().from(youtubePublications).where(eq(youtubePublications.id, publicationId));
  const video = await reload(db, publication.videoId);
  try {
    const result = await publisher.publish({
      title: video.title,
      description: video.title,
      sourceUrl: video.sourceUrl,
      destination: publication.destination as "notea_official" | "player_channel",
    });
    await db
      .update(youtubePublications)
      .set({ status: "published", externalId: result.externalId, error: null, updatedAt: new Date() })
      .where(eq(youtubePublications.id, publicationId));
    await notify(db, { userId: video.ownerUserId, type: "video", title: "Video published", body: `${video.title} is on YouTube.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "YouTube failed";
    await db
      .update(youtubePublications)
      .set({ status: "failed", error: message, updatedAt: new Date() })
      .where(eq(youtubePublications.id, publicationId));
    await notify(db, { userId: video.ownerUserId, type: "video", title: "Video needs attention", body: message });
  }
  const [updated] = await db.select().from(youtubePublications).where(eq(youtubePublications.id, publicationId));
  return updated;
}

export async function retryYouTube(db: Database, actorId: string, publicationId: string, publisher: YouTubePublisher = new SimulatedYouTubePublisher()) {
  await assertAccount(db, actorId, "write");
  const [publication] = await db.select().from(youtubePublications).where(eq(youtubePublications.id, publicationId));
  if (!publication) throw new AppError("not_found", "Publication not found");
  if (publication.status !== "failed") throw new AppError("not_failed", "Only a failed publish can be retried");
  if (publication.attempts >= MAX_ATTEMPTS) throw new AppError("retry_limit", "This video has used its retries");
  const video = await reload(db, publication.videoId);
  if (video.ownerUserId !== actorId) await assertPlatform(db, actorId, "youtube.manage");
  await db
    .update(youtubePublications)
    .set({ status: "processing", attempts: publication.attempts + 1, updatedAt: new Date() })
    .where(eq(youtubePublications.id, publicationId));
  return runPublication(db, publicationId, publisher);
}

export async function listYouTubeJobs(db: Database, actorId: string) {
  await assertPlatform(db, actorId, "youtube.manage");
  return db.select().from(youtubePublications);
}

export async function getVideo(db: Database, videoId: string) {
  return reload(db, videoId);
}
