import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Database } from "@/domain/db";
import { AppError } from "@/domain/errors";
import { mirrorToOfficialYouTube, officialYouTubePublisher, uploadVideo } from "@/domain/media";
import { publishPost } from "@/domain/social";

export async function storedFile(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return "";
  const safe = file.name.replace(/[^a-zA-Z0-9.]+/g, "-");
  const name = `${crypto.randomUUID()}-${safe}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

export async function saveThumbnail(video: { id: string; svg?: string }) {
  if (!video.svg) return;
  const dir = path.join(process.cwd(), "public", "uploads", "thumbs");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${video.id}.svg`), video.svg);
}

function isImage(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return false;
  return file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif)$/i.test(file.name);
}

function isVideo(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return false;
  return file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

export async function publishFromForm(db: Database, userId: string, formData: FormData) {
  const file = formData.get("file");
  const upload = await storedFile(file);
  const picked = String(formData.get("kind") || "text");
  const kind = picked === "image" || picked === "video" ? picked : "text";
  let mediaUrl: string | undefined;
  let thumbnailUrl: string | undefined;
  let videoId: string | undefined;
  if (kind === "image") {
    if (!upload || !isImage(file)) throw new AppError("media_required", "Choose a photo from your gallery");
    mediaUrl = upload;
  }
  if (kind === "video") {
    if (!upload || !isVideo(file)) throw new AppError("media_required", "Choose a video from your gallery");
    const cover = formData.get("cover");
    const coverUrl = await storedFile(cover);
    if (!coverUrl || !isImage(cover)) throw new AppError("media_required", "Choose a cover photo from your gallery");
    const created = await uploadVideo(db, userId, {
      title: (String(formData.get("body") || "") || (file instanceof File ? file.name : "Video")).slice(0, 80),
      sourceUrl: upload,
      thumbnailUrl: coverUrl,
    });
    await saveThumbnail(created);
    mediaUrl = upload;
    thumbnailUrl = coverUrl;
    videoId = created.id;
  }
  await publishPost(db, userId, {
    kind,
    category: String(formData.get("category") || "general"),
    body: String(formData.get("body") || ""),
    mediaUrl,
    thumbnailUrl,
    videoId,
    region: String(formData.get("region") || "") || undefined,
  });
  if (kind === "video" && videoId) await mirrorPostedVideo(db, userId, videoId);
}

async function mirrorPostedVideo(db: Database, userId: string, videoId: string) {
  const publisher = officialYouTubePublisher();
  if (!publisher) return;
  try {
    await mirrorToOfficialYouTube(db, userId, videoId, publisher);
  } catch {
    // The Notea post is already saved. A YouTube failure stays on the publication row.
  }
}
