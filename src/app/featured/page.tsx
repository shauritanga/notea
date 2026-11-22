export const instant = false;

import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Quiet, Shell } from "@/components/ui";
import { posts as postTable, videos } from "@/db/schema";
import { t, type CopyKey, type Lang } from "@/i18n/messages";
import { requireViewer } from "@/lib/viewer";

const categoryKey: Record<string, CopyKey> = {
  match: "catMatch",
  training: "catTraining",
  highlight: "catHighlight",
  women: "catWomen",
  grassroots: "catGrassroots",
  academy: "catAcademy",
};

export default async function FeaturedPage() {
  const { db, user, lang } = await requireViewer();
  const clips = await db.select().from(videos).where(eq(videos.status, "ready")).orderBy(desc(videos.createdAt));
  const posts = await db.select().from(postTable).where(eq(postTable.status, "published")).orderBy(desc(postTable.createdAt));
  return (
    <Shell lang={lang} name={user.name}>
      <div className="app-feed">
        <div className="app-block-head">
          <strong>{t(lang, "featured")}</strong>
          <Link href="/">{t(lang, "home")}</Link>
        </div>
        {posts.length === 0 ? <Quiet>{t(lang, "empty")}</Quiet> : null}
        {posts.map((post) => {
          const cover = coverFor(post, clips);
          return (
          <Link key={post.id} className="app-feature" href={`/post/${post.id}`}>
            <span className="app-feature-media" data-tone={tone(post.id)}>
              {cover ? <img src={cover} alt="" /> : null}
              <span className="app-feature-badge">{labelFor(lang, post.category)}</span>
            </span>
            <span className="app-feature-copy">
              <strong>{clip(post.body, 96) || post.publisherLabel}</strong>
              <span className="app-feature-foot">
                <small>{post.publisherLabel}</small>
                <span className="app-watch-pill">{t(lang, "watch")}</span>
              </span>
            </span>
          </Link>
          );
        })}
      </div>
    </Shell>
  );
}

function coverFor(
  post: { kind: string; mediaUrl: string | null; thumbnailUrl: string | null; videoId: string | null },
  clips: Array<{ id: string; thumbnailUrl: string | null }>,
) {
  if (post.kind === "image") return post.mediaUrl;
  if (post.thumbnailUrl) return post.thumbnailUrl;
  if (post.videoId) return clips.find((item) => item.id === post.videoId)?.thumbnailUrl ?? null;
  return null;
}

function labelFor(lang: Lang, category: string) {
  const key = categoryKey[category];
  return key ? t(lang, key) : category;
}

function clip(value: string, length: number) {
  const text = value.trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function tone(id: string) {
  const sum = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return String(sum % 4);
}
