import { clickAction, commentAction, followAction, likeAction, reportAction, saveAction, shareAction } from "@/app/actions";
import { Card, Submit } from "@/components/ui";
import { t, type Lang } from "@/i18n/messages";

export function PostCard({
  post,
  lang,
  back,
}: {
  post: { id: string; publisherLabel: string; category: string; body: string; mediaUrl: string | null; kind: string };
  lang: Lang;
  back: string;
}) {
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <strong>{post.publisherLabel}</strong>
        <span className="text-xs uppercase tracking-wide text-muted">{post.category}</span>
      </div>
      {post.body ? <p className="leading-7">{post.body}</p> : null}
      {post.mediaUrl ? <img className="w-full rounded-2xl" src={post.mediaUrl} alt="" /> : null}
      <div className="flex flex-wrap gap-2">
        {[
          [likeAction, t(lang, "like")],
          [saveAction, t(lang, "save")],
          [shareAction, t(lang, "share")],
        ].map(([action, label]) => (
          <form key={String(label)} action={action as (formData: FormData) => Promise<void>}>
            <input type="hidden" name="postId" value={post.id} />
            <input type="hidden" name="back" value={back} />
            <button className="rounded-full border border-line px-3 py-2 text-sm" type="submit">
              {label as string}
            </button>
          </form>
        ))}
        <a className="rounded-full border border-line px-3 py-2 text-sm" href={`/post/${post.id}`}>
          {t(lang, "comment")}
        </a>
      </div>
    </Card>
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
    <Card>
      <p className="text-xs uppercase tracking-wide text-grass">{campaign.sponsorKey === "kairuki" ? "Kairuki Hospital" : t(lang, "ads")}</p>
      <strong>{campaign.name}</strong>
      <p className="leading-7">{campaign.body}</p>
      <form action={clickAction}>
        <input type="hidden" name="campaignId" value={campaign.id} />
        <input type="hidden" name="back" value={back} />
        <Submit>{t(lang, "continue")}</Submit>
      </form>
    </Card>
  );
}

export function FollowButton({ lang, targetType, targetId, back }: { lang: Lang; targetType: string; targetId: string; back: string }) {
  return (
    <form action={followAction}>
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="back" value={back} />
      <button className="text-sm font-semibold text-grass" type="submit">
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
        <textarea className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3" name="body" placeholder={t(lang, "comment")} />
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
