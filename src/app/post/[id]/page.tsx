export const instant = false;

import { commentAction, followAction, likeAction, saveAction, shareAction } from "@/app/actions";
import { WatchReel } from "@/components/watch";
import { loadWatchReel } from "@/domain/social";
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
  const reel = await loadWatchReel(db, user.id, id);
  if (!reel) notFound();
  return (
    <div className="app-stage">
      <div className="app-screen app-screen-watch">
        <WatchReel
          slides={reel.slides}
          start={reel.index}
          focusId={id}
          commentsOpen={query.comments === "1"}
          labels={{
            like: t(lang, "like"),
            comment: t(lang, "comment"),
            save: t(lang, "save"),
            share: t(lang, "share"),
            follow: t(lang, "follow"),
            unfollow: t(lang, "unfollow"),
            copied: t(lang, "copied"),
            play: t(lang, "play"),
            pause: t(lang, "pause"),
            progress: t(lang, "progress"),
            soundOn: t(lang, "soundOn"),
            soundOff: t(lang, "soundOff"),
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
