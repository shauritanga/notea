export const instant = false;

import { sponsorAction } from "@/app/actions";
import { Area, Card, Choice, Field, Note, Quiet, Shell, Stack, Submit, Title } from "@/components/ui";
import { listSponsorCampaigns } from "@/domain/campaigns";
import { AppError } from "@/domain/errors";
import { readError, requireViewer } from "@/lib/viewer";

export default async function SponsorPage({ searchParams }: PageProps<"/">) {
  const { db, user, lang } = await requireViewer();
  let campaigns: Awaited<ReturnType<typeof listSponsorCampaigns>> = [];
  let denied = false;
  try {
    campaigns = await listSponsorCampaigns(db, user.id);
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    denied = true;
  }
  const error = await readError(searchParams);
  return (
    <Shell lang={lang} name={user.name}>
      <Title>Kairuki Hospital</Title>
      <Quiet>Educational notes for the football community. Founding sponsor.</Quiet>
      <Note>{error}</Note>
      {denied ? <Quiet>This desk is for the sponsor team.</Quiet> : (
      <form className="grid gap-3" action={sponsorAction}>
        <Field label="Title" name="name" required />
        <Area label="Message" name="body" required />
        <Choice label="Placement" name="placement" options={["feed_top", "feed_inline"]} />
        <Field label="Starts" name="startsAt" type="datetime-local" />
        <Field label="Ends" name="endsAt" type="datetime-local" />
        <Submit>Place in the feed</Submit>
      </form>
      )}
      <Stack>
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <strong>{campaign.name}</strong>
            <Quiet>{campaign.placement} · {campaign.impressions} views · {campaign.clicks} opens</Quiet>
          </Card>
        ))}
      </Stack>
    </Shell>
  );
}
