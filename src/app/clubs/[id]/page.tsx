export const instant = false;

import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { announcementAction, affiliateAction, followAction, opportunityAction, orgRoleAction, teamAction, verificationAction } from "@/app/actions";
import { Area, Card, Choice, Field, Note, Quiet, Shell, Stack, Submit, Title, Trust } from "@/components/ui";
import { teams } from "@/db/schema";
import { getOrganization, listOrganizationMembers } from "@/domain/organizations";
import { listAnnouncements, listOpportunities } from "@/domain/talent";
import { AppError } from "@/domain/errors";
import { t } from "@/i18n/messages";
import { readError, requireViewer } from "@/lib/viewer";

export default async function ClubPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db, user, lang } = await requireViewer();
  const { id } = await params;
  const org = await getOrganization(db, id, user.id).catch(() => null);
  if (!org) notFound();
  const announcements = await listAnnouncements(db, id);
  const opportunities = await listOpportunities(db, id);
  const squads = await db.select().from(teams).where(eq(teams.organizationId, id));
  let members: Awaited<ReturnType<typeof listOrganizationMembers>> = [];
  try {
    members = await listOrganizationMembers(db, user.id, id);
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
  }
  const error = await readError(searchParams);
  return (
    <Shell lang={lang} name={user.name}>
      <Title>{org.name}</Title>
      <Trust verified={org.verified} lang={lang} />
      <Quiet>{org.category} · {org.region} · {org.level} · {org.section}</Quiet>
      <p className="leading-7">{org.description}</p>
      <form action={followAction}>
        <input type="hidden" name="targetType" value="organization" />
        <input type="hidden" name="targetId" value={org.id} />
        <input type="hidden" name="back" value={`/clubs/${id}`} />
        <button className="text-sm font-semibold text-grass" type="submit">{t(lang, "follow")}</button>
      </form>
      <Note>{error}</Note>
      <Stack>
        {announcements.map((item) => (
          <Card key={item.id}><strong>{item.title}</strong><p>{item.body}</p></Card>
        ))}
        {opportunities.map((item) => (
          <Card key={item.id}><a href={`/opportunities/${item.id}`}>{item.title}</a><Quiet>{item.kind}</Quiet></Card>
        ))}
        {squads.map((team) => (
          <Quiet key={team.id}>{team.name} {team.ageGroup}</Quiet>
        ))}
      </Stack>
      {members.length > 0 ? (
        <Stack>
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between text-sm">
              <span>{member.role} · {member.status}</span>
              {member.role !== "owner" ? (
                <form action={orgRoleAction}>
                  <input type="hidden" name="organizationId" value={id} />
                  <input type="hidden" name="userId" value={member.userId} />
                  <input type="hidden" name="intent" value="revoke" />
                  <button className="text-muted" type="submit">Revoke</button>
                </form>
              ) : null}
            </div>
          ))}
          <form className="grid gap-3" action={orgRoleAction}>
            <input type="hidden" name="organizationId" value={id} />
            <Field label="Member user id" name="userId" required />
            <Choice label="Role" name="role" options={["administrator", "manager", "coach", "content_manager"]} />
            <Submit>Invite</Submit>
          </form>
          <form className="grid gap-3" action={teamAction}>
            <input type="hidden" name="organizationId" value={id} />
            <Field label="Team" name="name" required />
            <Field label="Age group" name="ageGroup" />
            <Submit>Add team</Submit>
          </form>
          <form className="grid gap-3" action={affiliateAction}>
            <input type="hidden" name="organizationId" value={id} />
            <Field label="Profile id" name="profileId" required />
            <Choice label="Team" name="teamId" options={["", ...squads.map((team) => team.id)]} />
            <Choice label="Role" name="role" options={["player", "coach"]} />
            <Submit>Add to team</Submit>
          </form>
          <form className="grid gap-3" action={announcementAction}>
            <input type="hidden" name="organizationId" value={id} />
            <Field label="Announcement" name="title" required />
            <Area label="Message" name="body" required />
            <Submit>Announce</Submit>
          </form>
          <form className="grid gap-3" action={opportunityAction}>
            <input type="hidden" name="organizationId" value={id} />
            <Field label="Trial or role" name="title" required />
            <Choice label="Kind" name="kind" options={["trial", "recruitment"]} />
            <Area label="Details" name="description" />
            <Field label="Region" name="region" />
            <Submit>Open opportunity</Submit>
          </form>
          <form className="grid gap-3" action={verificationAction}>
            <input type="hidden" name="subjectType" value="organization" />
            <input type="hidden" name="subjectId" value={id} />
            <input type="hidden" name="back" value={`/clubs/${id}`} />
            <Field label="Document name" name="documentName" defaultValue="registration" />
            <Field label="Document address" name="documentUrl" />
            <input name="file" type="file" />
            <Submit>Submit for verification</Submit>
          </form>
        </Stack>
      ) : (
        <Quiet>Contact details stay with the club administrators.</Quiet>
      )}
    </Shell>
  );
}
