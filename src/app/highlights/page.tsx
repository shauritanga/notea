export const instant = false;

import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Quiet, Shell } from "@/components/ui";
import { posts as postTable, videos } from "@/db/schema";
import { t } from "@/i18n/messages";
import { requireViewer } from "@/lib/viewer";

export default async function HighlightsPage() {
  const { db, user, lang } = await requireViewer();
  const clips = await db.select().from(videos).where(eq(videos.status, "ready")).orderBy(desc(videos.createdAt));
  const posts = await db.select().from(postTable).where(eq(postTable.status, "published")).orderBy(desc(postTable.createdAt));
  const highlights = posts.filter((post) => post.category === "highlight");
  return (
    <Shell lang={lang} name={user.name}>
      <div className="app-feed">
        <div className="app-block-head">
          <strong>{t(lang, "highlights")}</strong>
          <Link href="/">{t(lang, "home")}</Link>
        </div>
        {clips.length + highlights.length === 0 ? <Quiet>{t(lang, "empty")}</Quiet> : null}
        <div className="app-clip-grid">
          {clips.map((video) => (
            <Link key={video.id} className={video.thumbnailUrl ? "app-clip" : "app-clip app-pitch"} data-tone={tone(video.id)} href={`/videos/${video.id}`}>
              {video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" /> : null}
              <span>{video.title}</span>
            </Link>
          ))}
          {highlights.map((post) => (
            <Link key={post.id} className="app-clip app-pitch" data-tone={tone(post.id)} href={`/post/${post.id}`}>
              <span>{clip(post.body, 48)}</span>
            </Link>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function clip(value: string, length: number) {
  const text = value.trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function tone(id: string) {
  const sum = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return String(sum % 4);
}
