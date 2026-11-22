export const instant = false;

import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CampaignCard } from "@/components/post";
import { Quiet, Shell } from "@/components/ui";
import { posts as postTable, videos } from "@/db/schema";
import { getFeed } from "@/domain/social";
import { contentCategories, type FeedMode } from "@/domain/types";
import { t, type CopyKey, type Lang } from "@/i18n/messages";
import { requireViewer } from "@/lib/viewer";

const tabs: FeedMode[] = ["personalized", "following", "trending", "nearby"];
const labels = { personalized: "forYou", following: "following", trending: "trending", nearby: "nearby" } as const;
const chips: Array<{ cat: string; key: CopyKey; icon: "ball" | "cone" | "star" | "crest" | "sprout" | "school" }> = [
  { cat: "match", key: "catMatch", icon: "ball" },
  { cat: "training", key: "catTraining", icon: "cone" },
  { cat: "highlight", key: "catHighlight", icon: "star" },
  { cat: "women", key: "catWomen", icon: "crest" },
  { cat: "grassroots", key: "catGrassroots", icon: "sprout" },
  { cat: "academy", key: "catAcademy", icon: "school" },
];

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { db, user, lang } = await requireViewer();
  const params = await searchParams;
  const requested = typeof params.tab === "string" ? params.tab : "personalized";
  const mode = tabs.includes(requested as FeedMode) ? (requested as FeedMode) : "personalized";
  const cat = typeof params.cat === "string" && contentCategories.includes(params.cat as (typeof contentCategories)[number]) ? params.cat : "";
  const week = clampWeek(params.week);
  const day = typeof params.day === "string" ? params.day : "";
  const items = await getFeed(db, user.id, mode);
  const clips = await db.select().from(videos).where(eq(videos.status, "ready")).orderBy(desc(videos.createdAt));
  const fromFeed = items.flatMap((item) => (item.kind === "post" ? [item.post] : []));
  const posts = fromFeed.length
    ? fromFeed
    : await db.select().from(postTable).where(eq(postTable.status, "published")).orderBy(desc(postTable.createdAt));
  const campaign = items.find((item) => item.kind === "campaign");
  const locale = lang === "en" ? "en" : "sw";
  const today = startOfDay(new Date());
  const anchor = addDays(today, week * 7);
  const days = [-2, -1, 0, 1, 2].map((index) => addDays(anchor, index));
  const selected = days.some((date) => isoDay(date) === day) ? day : isoDay(anchor);
  const dated = day ? posts.filter((post) => isoDay(post.createdAt) === day) : posts;
  const visible = cat ? dated.filter((post) => post.category === cat) : dated;
  const featured = visible[0] ?? posts[0];
  const rest = visible.filter((post) => post.id !== featured?.id);
  const highlightPosts = posts.filter((post) => post.category === "highlight");
  const month = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(anchor);
  const back = homeHref({ week, day: day || undefined, tab: mode, cat });

  return (
    <Shell lang={lang} name={user.name}>
      <div className="app-home">
        <section>
          <div className="app-cal-head">
            <strong>{month}</strong>
            <div className="app-cal-nav">
              <Link href={homeHref({ week: week - 1, tab: mode, cat })} aria-label="Previous week">‹</Link>
              <Link href={homeHref({ week: week + 1, tab: mode, cat })} aria-label="Next week">›</Link>
            </div>
          </div>
          <div className="app-week">
            {days.map((date) => {
              const key = isoDay(date);
              return (
                <Link key={key} className={key === selected ? "is-on" : ""} href={homeHref({ week, day: key, tab: mode, cat })}>
                  <span>{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date)}</span>
                  <span className="num">{date.getDate()}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid gap-3">
          <div className="app-block-head">
            <strong>{t(lang, "featured")}</strong>
            <Link href="/discover">{t(lang, "seeAll")}</Link>
          </div>
          {featured ? (
            <Link className="app-feature app-pitch" data-tone={tone(featured.id)} href={`/post/${featured.id}`}>
              <span className="app-feature-badge">{labelFor(lang, featured.category)}</span>
              <div>
                <p>{clip(featured.body, 90)}</p>
                <small>{featured.publisherLabel}</small>
              </div>
              <span className="app-watch-pill">{t(lang, "watch")}</span>
            </Link>
          ) : clips[0] ? (
            <Link className="app-feature app-pitch" data-tone={tone(clips[0].id)} href={`/videos/${clips[0].id}`}>
              <span className="app-feature-badge">{t(lang, "catHighlight")}</span>
              <div>
                <p>{clips[0].title}</p>
              </div>
              <span className="app-watch-pill">{t(lang, "watch")}</span>
            </Link>
          ) : (
            <Quiet>{t(lang, "empty")}</Quiet>
          )}
        </section>

        <nav className="app-chips" aria-label={t(lang, "find")}>
          {chips.map((chip) => (
            <Link key={chip.cat} className={cat === chip.cat ? "app-chip is-on" : "app-chip"} href={homeHref({ week, day: day || undefined, tab: mode, cat: cat === chip.cat ? "" : chip.cat })}>
              <i><ChipIcon name={chip.icon} /></i>
              {t(lang, chip.key)}
            </Link>
          ))}
        </nav>

        <section className="grid gap-3">
          <div className="app-block-head">
            <strong>{t(lang, "allPosts")}</strong>
            <Link href="/discover">{t(lang, "seeAll")}</Link>
          </div>
          {rest.length === 0 ? <Quiet>{t(lang, "empty")}</Quiet> : null}
          <div className="app-pair">
            {rest.slice(0, 4).map((post) => (
              <Link key={post.id} className="app-mini" href={`/post/${post.id}`}>
                <time dateTime={post.createdAt.toISOString()}>{clock(post.createdAt, locale)}</time>
                <p>{clip(post.body, 80)}</p>
                <span className="app-mini-mark"><b>{initials(post.publisherLabel)}</b>{post.publisherLabel}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-3">
          <div className="app-block-head">
            <strong>{t(lang, "highlights")}</strong>
            <Link href="/videos/new">{t(lang, "seeAll")}</Link>
          </div>
          <div className="app-rail">
            {clips.map((video) => (
              <Link key={video.id} className="app-clip app-pitch" data-tone={tone(video.id)} href={`/videos/${video.id}`}>
                <span>{video.title}</span>
              </Link>
            ))}
            {highlightPosts.map((post) => (
              <Link key={post.id} className="app-clip app-pitch" data-tone={tone(post.id)} href={`/post/${post.id}`}>
                <span>{clip(post.body, 48)}</span>
              </Link>
            ))}
            {clips.length + highlightPosts.length === 0 ? <Quiet>{t(lang, "empty")}</Quiet> : null}
          </div>
        </section>

        {campaign?.kind === "campaign" ? <CampaignCard campaign={campaign.campaign} lang={lang} back={back} /> : (
          <Link className="app-sponsor" href="/sponsor">
            <p>{t(lang, "sponsor")}</p>
            <strong>{t(lang, "subscribe")}</strong>
          </Link>
        )}

        <section className="grid gap-3">
          <div className="app-block-head">
            <strong>{t(lang, "latest")}</strong>
            <Link href="/discover">{t(lang, "seeAll")}</Link>
          </div>
          <div className="app-pills">
            {tabs.map((tab) => (
              <Link key={tab} className={tab === mode ? "is-on" : ""} href={homeHref({ week, day: day || undefined, tab, cat })}>
                {t(lang, labels[tab])}
              </Link>
            ))}
          </div>
          <div className="app-news">
            {posts.slice(0, 4).map((post) => (
              <Link key={post.id} href={`/post/${post.id}`}>
                <span className="app-news-thumb app-pitch" data-tone={tone(post.id)} />
                <span>
                  <strong>{clip(post.body, 72)}</strong>
                  <small>{post.publisherLabel} · {labelFor(lang, post.category)}</small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}

function homeHref(next: { week?: number; day?: string; tab?: string; cat?: string }) {
  const query = new URLSearchParams();
  if (next.week) query.set("week", String(next.week));
  if (next.day) query.set("day", next.day);
  if (next.tab && next.tab !== "personalized") query.set("tab", next.tab);
  if (next.cat) query.set("cat", next.cat);
  const value = query.toString();
  return value ? `/?${value}` : "/";
}

function clampWeek(value: string | string[] | undefined) {
  const week = Number(typeof value === "string" ? value : 0);
  if (!Number.isFinite(week)) return 0;
  return Math.max(-12, Math.min(12, week));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, count: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function isoDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function clock(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
}

function clip(value: string, length: number) {
  const text = value.trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function tone(id: string) {
  const sum = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return String(sum % 4);
}

function labelFor(lang: Lang, category: string) {
  const match = chips.find((chip) => chip.cat === category);
  return match ? t(lang, match.key) : category;
}

function ChipIcon({ name }: { name: (typeof chips)[number]["icon"] }) {
  const common = { viewBox: "0 0 24 24", width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 1.8, "aria-hidden": true };
  if (name === "ball") return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 4v16M4 12h16M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>;
  if (name === "cone") return <svg {...common}><path d="M12 4 6 20h12z" /><path d="M8 14h8" /></svg>;
  if (name === "star") return <svg {...common}><path d="m12 3 2.4 5.2 5.6.7-4.2 3.8 1.2 5.6L12 15.8 6.9 18.3 8.1 12.7 4 8.9l5.6-.7z" /></svg>;
  if (name === "crest") return <svg {...common}><path d="M12 3 5 6v6c0 4.2 2.8 7.2 7 9 4.2-1.8 7-4.8 7-9V6z" /></svg>;
  if (name === "sprout") return <svg {...common}><path d="M12 21V10" /><path d="M12 13c-4 0-6-2.2-6-5 3.2 0 6 1.4 6 5zM12 11c3.6 0 6-2 6-5-3.4.2-6 1.8-6 5z" /></svg>;
  return <svg {...common}><path d="M4 20V9l8-5 8 5v11" /><path d="M10 20v-6h4v6" /></svg>;
}
