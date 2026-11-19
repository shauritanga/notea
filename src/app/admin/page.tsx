export const instant = false;

import Link from "next/link";
import { authorizeYoutubeAction, eraseAction, moderateAction, platformRoleAction, reviewAdAction, reviewVerificationAction, statusAction } from "@/app/actions";
import { Card, Choice, Field, Note, Quiet, Shell, Stack, Submit, Title } from "@/components/ui";
import { analytics, getAdminUser, listAudit, listUsers, moderationQueue } from "@/domain/admin";
import { campaignReport, listSponsorCampaigns } from "@/domain/campaigns";
import { AppError } from "@/domain/errors";
import { listYouTubeJobs } from "@/domain/media";
import { getVerificationCase, listVerificationQueue } from "@/domain/verification";
import { readError, requireViewer } from "@/lib/viewer";
import { campaigns } from "@/db/schema";

async function attempt<T>(run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof AppError) return null;
    throw error;
  }
}

export default async function AdminPage({ searchParams }: PageProps<"/">) {
  const { db, user, lang } = await requireViewer();
  const params = await searchParams;
  const section = typeof params.section === "string" ? params.section : "overview";
  const error = await readError(searchParams);
  const numbers = await attempt(() => analytics(db, user.id));
  const people = await attempt(() => listUsers(db, user.id));
  const queue = await attempt(() => listVerificationQueue(db, user.id));
  const reports = await attempt(() => moderationQueue(db, user.id));
  const sponsor = await attempt(() => listSponsorCampaigns(db, user.id));
  const jobs = await attempt(() => listYouTubeJobs(db, user.id));
  const audits = await attempt(() => listAudit(db, user.id));
  const ads = section === "ads" ? await db.select().from(campaigns) : [];
  const userRows = section === "users" && people
    ? await Promise.all(people.map(async (person) => ({ person, detail: await getAdminUser(db, user.id, person.id) })))
    : [];
  const verificationRows = section === "verification" && queue
    ? await Promise.all(queue.map(async (item) => ({ item, detail: await attempt(() => getVerificationCase(db, user.id, item.id)) })))
    : [];
  const sponsorRows = section === "sponsors" && sponsor
    ? await Promise.all(sponsor.map(async (campaign) => ({ campaign, report: await attempt(() => campaignReport(db, user.id, campaign.id)) })))
    : [];
  const sections = ["overview", "users", "verification", "moderation", "sponsors", "ads", "youtube", "roles", "audit"];
  return (
    <Shell lang={lang} name={user.name} wide>
      <Title>Usimamizi</Title>
      <div className="flex gap-2 overflow-x-auto">
        {sections.map((item) => (
          <Link key={item} className={`rounded-full px-3 py-2 text-sm ${item === section ? "bg-pitch text-[#111]" : "border border-line"}`} href={`/admin?section=${item}`}>
            {item}
          </Link>
        ))}
      </div>
      <Note>{error}</Note>
      {section === "overview" ? (
        numbers ? (
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(numbers).map(([key, value]) => (
              <Card key={key}><Quiet>{key}</Quiet><strong className="text-2xl">{value}</strong></Card>
            ))}
          </div>
        ) : <Quiet>You do not have an analytics role.</Quiet>
      ) : null}
      {section === "users" ? (
        <Stack>
          {userRows.map(({ person, detail }) => (
            <Card key={person.id}>
              <strong>{detail.name}</strong>
              <Quiet>{detail.status} {detail.phone ?? ""} {detail.email ?? ""}</Quiet>
              <form className="grid gap-3" action={statusAction}>
                <input type="hidden" name="userId" value={person.id} />
                <Choice label="Status" name="status" options={["active", "restricted", "suspended", "deactivated"]} defaultValue={detail.status} />
                <Submit>Update</Submit>
              </form>
              <form action={eraseAction}>
                <input type="hidden" name="userId" value={person.id} />
                <button className="text-sm text-muted" type="submit">Complete deletion</button>
              </form>
            </Card>
          ))}
        </Stack>
      ) : null}
      {section === "verification" ? (
        <Stack>
          {verificationRows.map(({ item, detail }) => (
            <Card key={item.id}>
              <strong>{item.subjectType}</strong>
              <Quiet>{item.status}</Quiet>
              {detail ? <Quiet>{detail.documents.map((document) => document.name).join(", ")}</Quiet> : <Quiet>Documents are hidden for this role.</Quiet>}
              <form className="grid gap-2" action={reviewVerificationAction}>
                <input type="hidden" name="applicationId" value={item.id} />
                <Choice label="Decision" name="decision" options={["approved", "rejected", "more_information_required", "suspended"]} />
                <Field label="Note" name="note" />
                <Submit>Record decision</Submit>
              </form>
            </Card>
          ))}
        </Stack>
      ) : null}
      {section === "moderation" && reports ? (
        <Stack>
          {reports.filter((report) => report.status === "open").map((report) => (
            <Card key={report.id}>
              <strong>{report.publisherLabel}</strong>
              <p>{report.body}</p>
              <Quiet>{report.reason}</Quiet>
              <form className="flex gap-2" action={moderateAction}>
                <input type="hidden" name="reportId" value={report.id} />
                <button className="rounded-full border border-line px-3 py-2 text-sm" name="decision" value="dismissed" type="submit">Dismiss</button>
                <button className="rounded-full bg-pitch px-3 py-2 text-sm text-white" name="decision" value="removed" type="submit">Remove</button>
              </form>
            </Card>
          ))}
        </Stack>
      ) : null}
      {section === "sponsors" ? (
        <Stack>
          {sponsorRows.map(({ campaign, report }) => (
            <Card key={campaign.id}><strong>{campaign.name}</strong><Quiet>{report ? `${report.impressions} views, ${report.clicks} opens` : campaign.status}</Quiet></Card>
          ))}
        </Stack>
      ) : null}
      {section === "ads" ? (
        <Stack>
          {ads.filter((ad) => ad.ownerType === "business").map((ad) => (
            <Card key={ad.id}>
              <strong>{ad.name}</strong>
              <Quiet>{ad.status} · {ad.paymentStatus}</Quiet>
              <form action={reviewAdAction}>
                <input type="hidden" name="campaignId" value={ad.id} />
                <button className="mr-3 text-sm" name="decision" value="approved" type="submit">Approve</button>
                <button className="text-sm text-muted" name="decision" value="rejected" type="submit">Reject</button>
              </form>
            </Card>
          ))}
        </Stack>
      ) : null}
      {section === "youtube" && jobs ? (
        <Stack>
          {jobs.map((job) => (
            <Card key={job.id}><strong>{job.destination}</strong><Quiet>{job.status} {job.error ?? job.externalId ?? ""}</Quiet></Card>
          ))}
          <form className="grid gap-3" action={authorizeYoutubeAction}>
            <Field label="Player profile id" name="profileId" required />
            <Submit>Authorize player channel</Submit>
          </form>
        </Stack>
      ) : null}
      {section === "roles" ? (
        <form className="grid gap-3" action={platformRoleAction}>
          <Field label="User id" name="userId" required />
          <Choice label="Role" name="role" options={["platform_admin", "content_moderator", "verification_officer", "advertising_manager", "sponsor_manager", "customer_support"]} />
          <div className="flex gap-3">
            <button className="h-12 rounded-full bg-pitch px-4 text-white" name="intent" value="grant" type="submit">Grant</button>
            <button className="h-12 rounded-full border border-line px-4" name="intent" value="revoke" type="submit">Revoke</button>
          </div>
        </form>
      ) : null}
      {section === "audit" && audits ? (
        <Stack>
          {audits.slice(-30).reverse().map((row) => (
            <Card key={row.id}><strong>{row.action}</strong><Quiet>{row.entityType} {row.entityId}</Quiet></Card>
          ))}
        </Stack>
      ) : null}
    </Shell>
  );
}
