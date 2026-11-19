export const instant = false;

import Link from "next/link";
import { CampaignCard, PostCard } from "@/components/post";
import { Quiet, Shell } from "@/components/ui";
import { t } from "@/i18n/messages";
import { requireViewer } from "@/lib/viewer";
import { getFeed } from "@/domain/social";
import type { FeedMode } from "@/domain/types";

const tabs: FeedMode[] = ["personalized", "following", "trending", "nearby"];
const labels = { personalized: "forYou", following: "following", trending: "trending", nearby: "nearby" } as const;

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { db, user, lang } = await requireViewer();
  const params = await searchParams;
  const requested = typeof params.tab === "string" ? params.tab : "personalized";
  const mode = tabs.includes(requested as FeedMode) ? (requested as FeedMode) : "personalized";
  const items = await getFeed(db, user.id, mode);
  return (
    <Shell lang={lang} name={user.name}>
      <div className="app-segments">
        {tabs.map((tab) => (
          <Link key={tab} className={tab === mode ? "is-on" : ""} href={`/?tab=${tab}`}>
            {t(lang, labels[tab])}
          </Link>
        ))}
      </div>
      <div className="app-feed">
        {items.length === 0 ? <Quiet>{t(lang, "empty")}</Quiet> : null}
        {items.map((item) =>
          item.kind === "campaign" ? (
            <CampaignCard key={item.campaign.id} campaign={item.campaign} lang={lang} back={`/?tab=${mode}`} />
          ) : (
            <PostCard key={item.post.id} post={item.post} lang={lang} back={`/?tab=${mode}`} />
          ),
        )}
      </div>
    </Shell>
  );
}
