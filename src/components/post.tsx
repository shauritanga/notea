import { clickAction, commentAction, followAction, likeAction, reportAction, saveAction, shareAction } from "@/app/actions";
import { Submit } from "@/components/ui";
import { t, type Lang } from "@/i18n/messages";

export function PostCard({
  post,
  lang,
  back,
}: {
  post: { id: string; publisherLabel: string; category: string; body: string; mediaUrl: string | null; thumbnailUrl?: string | null; kind: string };
  lang: Lang;
  back: string;
}) {
  const initials = post.publisherLabel
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <article className="app-post">
      <div className="app-post-head">
        <span className="app-avatar" aria-hidden>{initials}</span>
        <div>
          <strong>{post.publisherLabel}</strong>
          <span>{post.category}</span>
        </div>
      </div>
      {post.body ? <p>{post.body}</p> : null}
      {post.kind === "video" ? (post.thumbnailUrl ? <img src={post.thumbnailUrl} alt="" /> : null) : post.mediaUrl ? <img src={post.mediaUrl} alt="" /> : null}
      <div className="app-actions">
        {[
          [likeAction, t(lang, "like")],
          [saveAction, t(lang, "save")],
          [shareAction, t(lang, "share")],
        ].map(([action, label]) => (
          <form key={String(label)} action={action as (formData: FormData) => Promise<void>}>
            <input type="hidden" name="postId" value={post.id} />
            <input type="hidden" name="back" value={back} />
            <button type="submit">{label as string}</button>
          </form>
        ))}
        <a href={`/post/${post.id}`}>{t(lang, "comment")}</a>
      </div>
    </article>
  );
}

export function CampaignCard({
  campaign,
  lang,
  back,
}: {
  campaign: { id: string; name: string; body: string; sponsorKey: string | null };
  lang: Lang;
  back: string;
}) {
  return (
    <article className="app-sponsor">
      <p>{campaign.sponsorKey === "kairuki" ? "Kairuki Hospital" : t(lang, "ads")}</p>
      <strong>{campaign.name}</strong>
      <p>{campaign.body}</p>
      <form action={clickAction}>
        <input type="hidden" name="campaignId" value={campaign.id} />
        <input type="hidden" name="back" value={back} />
        <Submit>{t(lang, "continue")}</Submit>
      </form>
    </article>
  );
}

export function FollowButton({ lang, targetType, targetId, back }: { lang: Lang; targetType: string; targetId: string; back: string }) {
  return (
    <form action={followAction}>
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="back" value={back} />
      <button className="text-sm font-semibold text-accent-ink" type="submit">
        {t(lang, "follow")}
      </button>
    </form>
  );
}

export function CommentBox({ lang, postId }: { lang: Lang; postId: string }) {
  const back = `/post/${postId}`;
  return (
    <div className="grid gap-3">
      <form className="grid gap-3" action={commentAction}>
        <input type="hidden" name="postId" value={postId} />
        <input type="hidden" name="back" value={back} />
        <textarea className="min-h-24 rounded-2xl border border-line bg-fill px-4 py-3 text-ink" name="body" placeholder={t(lang, "comment")} />
        <Submit>{t(lang, "comment")}</Submit>
      </form>
      <form action={reportAction}>
        <input type="hidden" name="postId" value={postId} />
        <input type="hidden" name="back" value={back} />
        <input className="mb-2 h-12 w-full rounded-2xl border border-line px-4" name="reason" placeholder={t(lang, "report")} />
        <button className="text-sm text-muted" type="submit">
          {t(lang, "report")}
        </button>
      </form>
    </div>
  );
}
