export const instant = false;

import { and, eq } from "drizzle-orm";
import { adAction, payAdAction } from "@/app/actions";
import { Area, Card, Choice, Field, Note, Quiet, Shell, Stack, Submit, Title } from "@/components/ui";
import { businessMembers, businesses, campaigns } from "@/db/schema";
import { readError, requireViewer } from "@/lib/viewer";

export default async function CampaignsPage({ searchParams }: PageProps<"/">) {
  const { db, user, lang } = await requireViewer();
  const memberships = await db.select().from(businessMembers).where(and(eq(businessMembers.userId, user.id), eq(businessMembers.status, "active")));
  const shops = await db.select().from(businesses);
  const mine = shops.filter((shop) => memberships.some((member) => member.businessId === shop.id && member.role !== "content_manager"));
  const ads = await db.select().from(campaigns);
  const error = await readError(searchParams);
  return (
    <Shell lang={lang}>
      <Title>Advertising</Title>
      <Quiet>A business campaign stays out of the feed until it is paid and approved.</Quiet>
      <Note>{error}</Note>
      {mine.length === 0 ? <Quiet>Advertising is available to a business owner or marketing manager.</Quiet> : (
      <form className="grid gap-3" action={adAction}>
        <label className="text-sm font-medium">
          Business
          <select className="mt-2 h-12 w-full rounded-2xl border border-line px-4" name="businessId">
            {mine.map((shop) => (
              <option key={shop.id} value={shop.id}>{shop.name}</option>
            ))}
          </select>
        </label>
        <Field label="Name" name="name" required />
        <Area label="Message" name="body" required />
        <Choice label="Placement" name="placement" options={["feed_inline", "feed_top"]} />
        <Submit>Submit for approval</Submit>
      </form>
      )}
      <Stack>
        {ads.filter((ad) => mine.some((shop) => shop.id === ad.businessId)).map((ad) => (
          <Card key={ad.id}>
            <strong>{ad.name}</strong>
            <Quiet>{ad.status} · {ad.paymentStatus} · {ad.impressions} views</Quiet>
            {ad.paymentStatus !== "paid" ? (
              <form className="grid gap-3" action={payAdAction}>
                <input type="hidden" name="campaignId" value={ad.id} />
                <Field label="Payment reference" name="paymentRef" required />
                <Submit>Record payment</Submit>
              </form>
            ) : null}
          </Card>
        ))}
      </Stack>
    </Shell>
  );
}
