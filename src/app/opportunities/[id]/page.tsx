export const instant = false;

import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { applicationStatusAction, applyAction } from "@/app/actions";
import { Card, Note, Quiet, Shell, Stack, Submit, Title } from "@/components/ui";
import { applications, opportunities } from "@/db/schema";
import { AppError } from "@/domain/errors";
import { assertOrg } from "@/domain/access";
import { readError, requireViewer } from "@/lib/viewer";

export default async function OpportunityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db, user, lang } = await requireViewer();
  const { id } = await params;
  const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, id));
  if (!opportunity) notFound();
  let canManage = true;
  try {
    await assertOrg(db, user.id, opportunity.organizationId, "org.recruit");
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    canManage = false;
  }
  const rows = canManage ? await db.select().from(applications).where(eq(applications.opportunityId, id)) : [];
  const error = await readError(searchParams);
  return (
    <Shell lang={lang} name={user.name}>
      <Title>{opportunity.title}</Title>
      <Quiet>{opportunity.kind} · {opportunity.status} · {opportunity.region}</Quiet>
      <p className="leading-7">{opportunity.description}</p>
      <Note>{error}</Note>
      <form action={applyAction}>
        <input type="hidden" name="opportunityId" value={id} />
        <Submit>Apply</Submit>
      </form>
      <Stack>
        {rows.map((application) => (
          <Card key={application.id}>
            <Quiet>{application.status}</Quiet>
            <form action={applicationStatusAction}>
              <input type="hidden" name="opportunityId" value={id} />
              <input type="hidden" name="applicationId" value={application.id} />
              <select className="h-12 w-full rounded-2xl border border-line px-4" name="status" defaultValue={application.status}>
                {["reviewing", "accepted", "declined"].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <button className="mt-3 text-sm font-semibold" type="submit">Update</button>
            </form>
          </Card>
        ))}
      </Stack>
    </Shell>
  );
}
