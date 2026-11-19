export const instant = false;

import { and, eq } from "drizzle-orm";
import { logoutAction, profileAction, switchAction } from "@/app/actions";
import { Area, Card, Choice, Field, Note, Quiet, Shell, Stack, Submit, Title } from "@/components/ui";
import { businessMembers, businesses, organizationMembers, organizations, profiles } from "@/db/schema";
import { getActiveContext } from "@/domain/accounts";
import { readError, requireViewer } from "@/lib/viewer";

export default async function YouPage({ searchParams }: PageProps<"/">) {
  const { db, user, lang } = await requireViewer();
  const mine = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  const orgs = await db.select().from(organizationMembers).where(and(eq(organizationMembers.userId, user.id), eq(organizationMembers.status, "active")));
  const shops = await db.select().from(businessMembers).where(and(eq(businessMembers.userId, user.id), eq(businessMembers.status, "active")));
  const orgRows = await db.select().from(organizations);
  const shopRows = await db.select().from(businesses);
  const active = await getActiveContext(db, user.id);
  const error = await readError(searchParams);
  return (
    <Shell lang={lang}>
      <Title>{user.name}</Title>
      <Quiet>{active ? `Posting as ${active.kind}` : "Choose who you are posting as."}</Quiet>
      <Note>{error}</Note>
      <Stack>
        {mine.map((profile) => (
          <Card key={profile.id}>
            <div className="flex items-center justify-between">
              <strong>{profile.displayName}</strong>
              <span className="text-xs uppercase text-muted">{profile.type}</span>
            </div>
            <form action={switchAction}>
              <input type="hidden" name="kind" value="profile" />
              <input type="hidden" name="id" value={profile.id} />
              <button className="text-sm font-semibold text-grass" type="submit">Use this profile</button>
            </form>
            <form className="grid gap-3" action={profileAction}>
              <input type="hidden" name="profileId" value={profile.id} />
              <Field label="Name" name="displayName" defaultValue={profile.displayName} />
              <Area label="Bio" name="bio" defaultValue={profile.bio} />
              <Field label="Region" name="region" defaultValue={profile.region ?? ""} />
              <Choice label="Visibility" name="visibility" options={["public", "private"]} defaultValue={profile.visibility} />
              <Field label="Position" name="position" defaultValue={profile.position ?? ""} />
              <Field label="Foot" name="preferredFoot" defaultValue={profile.preferredFoot ?? ""} />
              <Area label="History" name="footballHistory" defaultValue={profile.footballHistory ?? ""} />
              <Area label="Achievements" name="achievements" defaultValue={profile.achievements ?? ""} />
              <Field label="Level" name="level" defaultValue={profile.level ?? ""} />
              <Field label="Section" name="section" defaultValue={profile.section ?? ""} />
              <Field label="Private phone" name="contactPhone" defaultValue={profile.contactPhone ?? ""} />
              <Field label="Private email" name="contactEmail" defaultValue={profile.contactEmail ?? ""} />
              <Field label="Precise location" name="preciseLocation" defaultValue={profile.preciseLocation ?? ""} />
              <label className="flex gap-2 text-sm"><input type="checkbox" name="showContact" defaultChecked={profile.privacy.showContact} /> Show contact</label>
              <label className="flex gap-2 text-sm"><input type="checkbox" name="showPreciseLocation" defaultChecked={profile.privacy.showPreciseLocation} /> Show precise location</label>
              <label className="flex gap-2 text-sm"><input type="checkbox" name="allowRecruitmentContact" defaultChecked={profile.privacy.allowRecruitmentContact} /> Allow recruitment contact</label>
              <Submit>Save profile</Submit>
            </form>
          </Card>
        ))}
        {orgs.map((member) => {
          const org = orgRows.find((item) => item.id === member.organizationId);
          return (
            <Card key={member.id}>
              <strong>{org?.name}</strong>
              <Quiet>{member.role}</Quiet>
              <form action={switchAction}>
                <input type="hidden" name="kind" value="organization" />
                <input type="hidden" name="id" value={member.organizationId} />
                <button className="text-sm font-semibold" type="submit">Post as this club</button>
              </form>
              <a className="text-sm" href={`/clubs/${member.organizationId}`}>Open club</a>
            </Card>
          );
        })}
        {shops.map((member) => {
          const shop = shopRows.find((item) => item.id === member.businessId);
          return (
            <Card key={member.id}>
              <strong>{shop?.name}</strong>
              <Quiet>{member.role}</Quiet>
              <form action={switchAction}>
                <input type="hidden" name="kind" value="business" />
                <input type="hidden" name="id" value={member.businessId} />
                <button className="text-sm font-semibold" type="submit">Post as this business</button>
              </form>
              <a className="text-sm" href={`/businesses/${member.businessId}`}>Open business</a>
            </Card>
          );
        })}
      </Stack>
      <div className="grid gap-3">
        <a className="text-sm" href="/settings">Settings</a>
        <a className="text-sm" href="/admin">Admin desk</a>
        <a className="text-sm" href="/sponsor">Kairuki</a>
        <a className="text-sm" href="/campaigns">Advertising</a>
        <form action={logoutAction}>
          <button className="text-sm text-muted" type="submit">Sign out</button>
        </form>
      </div>
    </Shell>
  );
}
