export const instant = false;

import Link from "next/link";
import { eq } from "drizzle-orm";
import { commentAction, likeAction } from "@/app/actions";
import { Player } from "@/components/player";
import { videos } from "@/db/schema";
import { authorName, getPost, listComments } from "@/domain/social";
import { t } from "@/i18n/messages";
import { requireViewer } from "@/lib/viewer";
import { notFound } from "next/navigation";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { db, lang } = await requireViewer();
  const { id } = await params;
  const post = await getPost(db, id);
  if (!post) notFound();
  const comments = await listComments(db, id);
  const named = await Promise.all(comments.map(async (comment) => ({
    ...comment,
    name: await authorName(db, comment.userId).catch(() => ""),
  })));
  const tone = String([...post.id].reduce((total, char) => total + char.charCodeAt(0), 0) % 4);
  const [clip] = post.videoId ? await db.select().from(videos).where(eq(videos.id, post.videoId)) : [];
  const picture = post.mediaUrl && !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(post.mediaUrl);
  return (
    <div className="app-stage">
      <div className="app-screen app-screen-watch">
        <div className="app-watch">
          <div className="app-watch-visual">
            {clip?.renditions?.length ? (
              <Player title={clip.title} renditions={clip.renditions} poster={clip.thumbnailUrl} fill />
            ) : picture ? (
              <img src={post.mediaUrl ?? ""} alt="" />
            ) : post.mediaUrl ? (
              <video src={post.mediaUrl} controls playsInline />
            ) : (
              <div className="app-pitch" data-tone={tone} />
            )}
            <Link className="app-watch-x" href="/" aria-label="Close">×</Link>
            <div className="app-watch-copy">
              <strong>{post.publisherLabel}</strong>
              {post.body ? <p>{post.body}</p> : null}
            </div>
            <div className="app-hearts" aria-hidden>
              <Heart />
              <Heart />
            </div>
          </div>
          <div className="app-watch-thread">
            {named.map((comment) => (
              <p key={comment.id} className="app-watch-note">
                <b>{initials(comment.name || "N")}</b>
                <span><strong>{comment.name}</strong> {comment.body}</span>
              </p>
            ))}
          </div>
          <div className="app-watch-bar">
            <form action={commentAction}>
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="back" value={`/post/${post.id}`} />
              <input name="body" placeholder={t(lang, "comment")} required />
              <button className="app-watch-send" type="submit" aria-label={t(lang, "comment")}>
                <SendIcon />
              </button>
            </form>
            <form action={likeAction}>
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="back" value={`/post/${post.id}`} />
              <button className="app-watch-heart" type="submit" aria-label={t(lang, "like")}>
                <Heart />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function Heart() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M4 12 20 4l-6 16-2.2-6.2z" />
    </svg>
  );
}
