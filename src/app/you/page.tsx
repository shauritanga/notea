export const instant = false;

import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Quiet, Shell } from "@/components/ui";
import { follows, posts as postTable, profiles, videos } from "@/db/schema";
import { getActiveContext } from "@/domain/accounts";
import { t, type Lang } from "@/i18n/messages";
import { requireViewer } from "@/lib/viewer";

export default async function YouPage() {
  const { db, user, lang } = await requireViewer();
  const mine = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  const active = await getActiveContext(db, user.id);
  const profile = mine.find((item) => item.id === active?.profileId) ?? mine[0];
  const clips = await db.select().from(videos).where(eq(videos.status, "ready")).orderBy(desc(videos.createdAt));
  const published = await db
    .select()
    .from(postTable)
    .where(eq(postTable.authorUserId, user.id))
    .orderBy(desc(postTable.createdAt));
  const posts = published.filter((post) => post.status === "published");
  const relations = await db.select().from(follows);
  const followers = profile
    ? relations.filter((row) => row.targetType === "profile" && row.targetId === profile.id).length
    : 0;
  const following = relations.filter((row) => row.followerUserId === user.id).length;
  const name = profile?.displayName || user.name;
  const role = profile ? roleLabel(lang, profile.type) : "";
  const meta = [role, profile?.region, profile?.position].filter(Boolean).join(" · ");
  return (
    <Shell lang={lang} name={user.name}>
      <div className="app-ig">
        <div className="app-ig-top">
          <span className="app-ig-avatar">
            {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : initials(name)}
          </span>
          <div className="app-ig-stats">
            <p><strong>{posts.length}</strong><span>{t(lang, "statPosts")}</span></p>
            <p><strong>{followers}</strong><span>{t(lang, "statFollowers")}</span></p>
            <p><strong>{following}</strong><span>{t(lang, "statFollowing")}</span></p>
          </div>
        </div>
        <div className="app-ig-copy">
          <strong>
            {name}
            {profile?.verifiedStatus === "approved" ? <i aria-label={t(lang, "verified")}>✓</i> : null}
          </strong>
          {meta ? <p className="app-ig-meta">{meta}</p> : null}
          {profile?.bio ? <p className="app-ig-bio">{profile.bio}</p> : null}
        </div>
        <div className="app-ig-actions">
          <Link href="/you/edit">{t(lang, "editProfile")}</Link>
          <Link href="/settings">{t(lang, "settings")}</Link>
        </div>
        {posts.length === 0 ? <Quiet>{t(lang, "empty")}</Quiet> : null}
        <div className="app-ig-grid">
          {posts.map((post) => {
            const cover = coverFor(post, clips);
            return (
              <Link key={post.id} href={`/post/${post.id}`}>
                {cover ? <img src={cover} alt="" /> : <span className="app-ig-tile">{clip(post.body) || name}</span>}
                {post.kind === "video" ? <span className="app-ig-play" aria-hidden>▶</span> : null}
              </Link>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

function roleLabel(lang: Lang, type: string) {
  if (type === "fan") return t(lang, "roleFan");
  if (type === "player") return t(lang, "rolePlayer");
  if (type === "coach") return t(lang, "roleCoach");
  if (type === "scout") return t(lang, "roleScout");
  return type;
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

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function clip(value: string) {
  const text = value.trim();
  return text.length > 48 ? `${text.slice(0, 47)}…` : text;
}
