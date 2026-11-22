export const instant = false;

import { eq } from "drizzle-orm";
import { commentAction, followAction, likeAction, saveAction, shareAction } from "@/app/actions";
import { WatchPost } from "@/components/watch";
import { businesses, organizations, profiles, videos } from "@/db/schema";
import { authorName, getPost, listComments, watchState } from "@/domain/social";
import { t } from "@/i18n/messages";
import { requireViewer } from "@/lib/viewer";
import { notFound } from "next/navigation";

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { db, user, lang } = await requireViewer();
  const { id } = await params;
  const query = await searchParams;
  const post = await getPost(db, id);
  if (!post) notFound();
  const comments = await listComments(db, id);
  const named = await Promise.all(comments.map(async (comment) => ({
    id: comment.id,
    body: comment.body,
    name: await authorName(db, comment.userId).catch(() => ""),
  })));
  const account = await accountFor(db, post);
  const state = await watchState(db, user.id, post.id, account.targetId ? { type: account.targetType, id: account.targetId } : null);
  const [clip] = post.videoId ? await db.select().from(videos).where(eq(videos.id, post.videoId)) : [];
  const videoSrc = playable(clip?.sourceUrl || (post.kind === "video" ? post.mediaUrl : ""));
  const imageSrc = post.kind === "image" ? post.mediaUrl || "" : post.kind === "video" ? post.thumbnailUrl || clip?.thumbnailUrl || "" : "";
  return (
    <div className="app-stage">
      <div className="app-screen app-screen-watch">
        <WatchPost
          id={post.id}
          caption={post.body}
          media={{
            kind: post.kind === "video" && videoSrc ? "video" : post.kind === "image" && (post.mediaUrl || imageSrc) ? "image" : post.kind === "text" ? "text" : videoSrc ? "video" : "image",
            src: post.kind === "video" ? videoSrc : post.mediaUrl || imageSrc,
            poster: post.thumbnailUrl || clip?.thumbnailUrl || "",
          }}
          account={{ ...account, self: post.authorUserId === user.id }}
          state={state}
          comments={named}
          commentsOpen={query.comments === "1"}
          labels={{
            like: t(lang, "like"),
            comment: t(lang, "comment"),
            save: t(lang, "save"),
            share: t(lang, "share"),
            follow: t(lang, "follow"),
            unfollow: t(lang, "unfollow"),
            copied: t(lang, "copied"),
          }}
          likeAction={likeAction}
          saveAction={saveAction}
          shareAction={shareAction}
          commentAction={commentAction}
          followAction={followAction}
        />
      </div>
    </div>
  );
}

async function accountFor(
  db: Awaited<ReturnType<typeof requireViewer>>["db"],
  post: { publisherLabel: string; publisherProfileId: string | null; publisherOrganizationId: string | null; publisherBusinessId: string | null },
) {
  if (post.publisherProfileId) {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, post.publisherProfileId));
    return face(profile?.displayName || post.publisherLabel, profile?.avatarUrl || "", `/players/${post.publisherProfileId}`, "profile", post.publisherProfileId);
  }
  if (post.publisherOrganizationId) {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, post.publisherOrganizationId));
    return face(org?.name || post.publisherLabel, org?.logoUrl || "", `/clubs/${post.publisherOrganizationId}`, "organization", post.publisherOrganizationId);
  }
  if (post.publisherBusinessId) {
    const [shop] = await db.select().from(businesses).where(eq(businesses.id, post.publisherBusinessId));
    return face(shop?.name || post.publisherLabel, shop?.logoUrl || "", `/businesses/${post.publisherBusinessId}`, "business", post.publisherBusinessId);
  }
  return face(post.publisherLabel, "", "/discover", "", "");
}

function face(name: string, avatar: string, href: string, targetType: string, targetId: string) {
  const initials = name.split(" ").slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "N";
  return { name, avatar, href, initials, targetType, targetId };
}

function playable(url: string | null | undefined) {
  if (!url) return "";
  return url.startsWith("/uploads/") ? url.split("?")[0] : url;
}
