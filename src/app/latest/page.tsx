export const instant = false;

import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Quiet, Shell } from "@/components/ui";
import { posts as postTable, videos } from "@/db/schema";
import { getFeed } from "@/domain/social";
import { type FeedMode } from "@/domain/types";
import { t, type CopyKey, type Lang } from "@/i18n/messages";
import { requireViewer } from "@/lib/viewer";

const tabs: FeedMode[] = ["personalized", "following", "trending", "nearby"];
const labels = { personalized: "forYou", following: "following", trending: "trending", nearby: "nearby" } as const;
const categoryKey: Record<string, CopyKey> = {
  match: "catMatch",
  training: "catTraining",
  highlight: "catHighlight",
  women: "catWomen",
  grassroots: "catGrassroots",
  academy: "catAcademy",
};

export default async function LatestPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db, user, lang } = await requireViewer();
  const params = await searchParams;
  const requested = typeof params.tab === "string" ? params.tab : "personalized";
  const mode = tabs.includes(requested as FeedMode) ? (requested as FeedMode) : "personalized";
  const items = await getFeed(db, user.id, mode);
  const clips = await db.select().from(videos).where(eq(videos.status, "ready")).orderBy(desc(videos.createdAt));
  const fromFeed = items.flatMap((item) => (item.kind === "post" ? [item.post] : []));
  const posts = fromFeed.length
    ? fromFeed
    : await db.select().from(postTable).where(eq(postTable.status, "published")).orderBy(desc(postTable.createdAt));
  return (
    <Shell lang={lang} name={user.name}>
      <div className="app-feed">
        <div className="app-block-head">
          <strong>{t(lang, "latest")}</strong>
          <Link href="/">{t(lang, "home")}</Link>
        </div>
        <div className="app-pills">
          {tabs.map((tab) => (
            <Link key={tab} className={tab === mode ? "is-on" : ""} href={tab === "personalized" ? "/latest" : `/latest?tab=${tab}`}>
              {t(lang, labels[tab])}
            </Link>
          ))}
        </div>
        {posts.length === 0 ? <Quiet>{t(lang, "empty")}</Quiet> : null}
        <div className="app-news">
          {posts.map((post) => {
            const cover = coverFor(post, clips);
            return (
              <Link key={post.id} href={`/post/${post.id}`}>
                <span className="app-news-thumb">
                  {cover ? <img src={cover} alt="" /> : <span className="app-pitch" data-tone={tone(post.id)} />}
                </span>
                <span>
                  <strong>{clip(post.body, 72)}</strong>
                  <small>{post.publisherLabel} · {labelFor(lang, post.category)}</small>
                </span>
              </Link>
            );
          })}
        </div>
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
