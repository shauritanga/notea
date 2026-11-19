export const instant = false;

import Link from "next/link";
import { Card, Ghost, Quiet, Shell, Stack, Title } from "@/components/ui";
import { t } from "@/i18n/messages";
import { searchAll } from "@/domain/social";
import { listOpportunities } from "@/domain/talent";
import { readError, requireViewer } from "@/lib/viewer";

export default async function DiscoverPage({ searchParams }: PageProps<"/">) {
  const { db, user, lang } = await requireViewer();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const results = query ? await searchAll(db, user.id, query) : null;
  const trials = await listOpportunities(db);
  return (
    <Shell lang={lang}>
      <Title>{t(lang, "find")}</Title>
      <form>
        <input className="h-12 w-full rounded-full border border-line bg-white px-4" name="q" defaultValue={query} placeholder={t(lang, "search")} />
      </form>
      <div className="grid grid-cols-2 gap-3">
        <Ghost href="/players">{t(lang, "players")}</Ghost>
        <Ghost href="/clubs/new">{t(lang, "clubs")}</Ghost>
        <Ghost href="/businesses/new">{t(lang, "businesses")}</Ghost>
        <Ghost href="/videos/new">{t(lang, "videos")}</Ghost>
        <Ghost href="/shortlists">{t(lang, "trials")}</Ghost>
        <Ghost href="/sponsor">{t(lang, "sponsor")}</Ghost>
      </div>
      {results ? (
        <Stack>
          {results.profiles.map((profile) => (
            <Link key={profile.id} href={`/players/${profile.id}`}>{profile.displayName}</Link>
          ))}
          {results.organizations.map((org) => (
            <Link key={org.id} href={`/clubs/${org.id}`}>{org.name}</Link>
          ))}
          {results.businesses.map((shop) => (
            <Link key={shop.id} href={`/businesses/${shop.id}`}>{shop.name}</Link>
          ))}
          {results.posts.map((post) => (
            <Link key={post.id} href={`/post/${post.id}`}>{post.publisherLabel}: {post.body.slice(0, 80)}</Link>
          ))}
          {results.videos.map((video) => (
            <Link key={video.id} href={`/videos/${video.id}`}>{video.title}</Link>
          ))}
          {results.profiles.length + results.organizations.length + results.businesses.length + results.posts.length + results.videos.length === 0 ? <Quiet>{t(lang, "empty")}</Quiet> : null}
        </Stack>
      ) : null}
      <Stack>
        {trials.filter((trial) => trial.status === "open").map((trial) => (
          <Card key={trial.id}>
            <Link href={`/opportunities/${trial.id}`}>{trial.title}</Link>
            <Quiet>{trial.kind} · {trial.region}</Quiet>
          </Card>
        ))}
      </Stack>
    </Shell>
  );
}
