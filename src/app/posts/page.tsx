export const instant = false;

import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Quiet, Shell } from "@/components/ui";
import { posts as postTable } from "@/db/schema";
import { contentCategories } from "@/domain/types";
import { t } from "@/i18n/messages";
import { requireViewer } from "@/lib/viewer";

export default async function PostsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db, user, lang } = await requireViewer();
  const params = await searchParams;
  const day = typeof params.day === "string" ? params.day : "";
  const cat = typeof params.cat === "string" && contentCategories.includes(params.cat as (typeof contentCategories)[number]) ? params.cat : "";
  const published = await db.select().from(postTable).where(eq(postTable.status, "published")).orderBy(desc(postTable.createdAt));
  const dated = day ? published.filter((post) => isoDay(post.createdAt) === day) : published;
  const posts = cat ? dated.filter((post) => post.category === cat) : dated;
  const locale = lang === "en" ? "en" : "sw";
  return (
    <Shell lang={lang} name={user.name}>
      <div className="app-feed">
        <div className="app-block-head">
          <strong>{t(lang, "allPosts")}</strong>
          <Link href="/">{t(lang, "home")}</Link>
        </div>
        {posts.length === 0 ? <Quiet>{t(lang, "empty")}</Quiet> : null}
        <div className="app-pair">
          {posts.map((post) => (
            <Link key={post.id} className="app-mini" href={`/post/${post.id}`}>
              <time dateTime={post.createdAt.toISOString()}>{clock(post.createdAt, locale)}</time>
              <p>{clip(post.body, 80)}</p>
              <span className="app-mini-mark"><b>{initials(post.publisherLabel)}</b>{post.publisherLabel}</span>
            </Link>
          ))}
        </div>
      </div>
    </Shell>
  );
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
