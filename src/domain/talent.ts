import { and, eq } from "drizzle-orm";
import {
  affiliations,
  announcements,
  applications,
  follows,
  highlights,
  opportunities,
  organizationMembers,
  profiles,
  shortlistItems,
  shortlists,
  teams,
  users,
} from "@/db/schema";
import { assertAccount, assertOrg, audit } from "@/domain/access";
import { mustUser } from "@/domain/access";
import { newId } from "@/domain/crypto";
import type { Database } from "@/domain/db";
import { AppError } from "@/domain/errors";
import { notify } from "@/domain/notify";

async function ownedProfile(db: Database, userId: string, type: string) {
  const rows = await db.select().from(profiles).where(and(eq(profiles.userId, userId), eq(profiles.type, type)));
  return rows[0] ?? null;
}

export async function addHighlight(db: Database, actorId: string, input: { title: string; videoUrl?: string }) {
  await assertAccount(db, actorId, "write");
  const player = await ownedProfile(db, actorId, "player");
  if (!player) throw new AppError("player_required", "Add a player profile before publishing highlights");
  const id = newId();
  await db.insert(highlights).values({
    id,
    profileId: player.id,
    title: input.title.trim(),
    videoUrl: input.videoUrl ?? null,
    selfReported: true,
    verified: false,
    createdAt: new Date(),
  });
  return id;
}

export async function listHighlights(db: Database, profileId: string) {
  return db.select().from(highlights).where(eq(highlights.profileId, profileId));
}

export async function searchPlayers(
  db: Database,
  actorId: string,
  filters: { query?: string; position?: string; preferredFoot?: string; region?: string; level?: string; section?: string; verifiedOnly?: boolean },
) {
  await assertAccount(db, actorId, "read");
  const rows = await db.select().from(profiles).where(eq(profiles.type, "player"));
  const needle = filters.query?.trim().toLowerCase() ?? "";
  const owners = await db.select().from(users);
  return rows.filter((profile) => {
    if (profile.visibility !== "public") return false;
    const owner = owners.find((user) => user.id === profile.userId);
    if (!owner || owner.status === "deactivated") return false;
    if (needle && !`${profile.displayName} ${profile.bio}`.toLowerCase().includes(needle)) return false;
    if (filters.position && profile.position !== filters.position) return false;
    if (filters.preferredFoot && profile.preferredFoot !== filters.preferredFoot) return false;
    if (filters.region && profile.region !== filters.region) return false;
    if (filters.level && profile.level !== filters.level) return false;
    if (filters.section && profile.section !== filters.section) return false;
    if (filters.verifiedOnly && profile.verifiedStatus !== "approved") return false;
    return true;
  }).map((profile) => ({
    ...profile,
    contactPhone: null,
    contactEmail: null,
    preciseLocation: null,
    selfReported: profile.verifiedStatus !== "approved",
    verified: profile.verifiedStatus === "approved",
  }));
}

export async function createShortlist(db: Database, actorId: string, name: string) {
  await assertAccount(db, actorId, "write");
  const scout = await ownedProfile(db, actorId, "scout");
  if (!scout) throw new AppError("scout_required", "Shortlists belong to a scout profile");
  const id = newId();
  await db.insert(shortlists).values({ id, scoutProfileId: scout.id, name: name.trim(), createdAt: new Date() });
  return id;
}

export async function addToShortlist(db: Database, actorId: string, shortlistId: string, playerProfileId: string) {
  await assertAccount(db, actorId, "write");
  const [shortlist] = await db.select().from(shortlists).where(eq(shortlists.id, shortlistId));
  if (!shortlist) throw new AppError("not_found", "Shortlist not found");
  const [scout] = await db.select().from(profiles).where(eq(profiles.id, shortlist.scoutProfileId));
  if (!scout || scout.userId !== actorId) throw new AppError("forbidden", "That shortlist is not yours");
  const [player] = await db.select().from(profiles).where(eq(profiles.id, playerProfileId));
  if (!player || player.type !== "player") throw new AppError("player_required", "Add a player to the shortlist");
  await db.insert(shortlistItems).values({ shortlistId, playerProfileId }).onConflictDoNothing();
}

export async function listShortlist(db: Database, actorId: string, shortlistId: string) {
  await assertAccount(db, actorId, "read");
  const [shortlist] = await db.select().from(shortlists).where(eq(shortlists.id, shortlistId));
  if (!shortlist) throw new AppError("not_found", "Shortlist not found");
  const [scout] = await db.select().from(profiles).where(eq(profiles.id, shortlist.scoutProfileId));
  if (!scout || scout.userId !== actorId) throw new AppError("forbidden", "That shortlist is not yours");
  return db.select().from(shortlistItems).where(eq(shortlistItems.shortlistId, shortlistId));
}

export async function createOpportunity(
  db: Database,
  actorId: string,
  input: { organizationId: string; title: string; kind: "trial" | "recruitment"; description: string; region?: string },
) {
  await assertOrg(db, actorId, input.organizationId, "org.recruit");
  const id = newId();
  await db.insert(opportunities).values({
    id,
    organizationId: input.organizationId,
    title: input.title.trim(),
    kind: input.kind,
    description: input.description.trim(),
    region: input.region ?? null,
    status: "open",
    createdBy: actorId,
    createdAt: new Date(),
  });
  return id;
}

export async function applyToOpportunity(db: Database, actorId: string, opportunityId: string) {
  await assertAccount(db, actorId, "write");
  const player = await ownedProfile(db, actorId, "player");
  if (!player) throw new AppError("player_required", "Apply with a player profile");
  const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, opportunityId));
  if (!opportunity || opportunity.status !== "open") throw new AppError("not_open", "This opportunity is closed");
  const id = newId();
  await db.insert(applications).values({
    id,
    opportunityId,
    playerProfileId: player.id,
    status: "submitted",
    createdAt: new Date(),
  });
  await notify(db, {
    userId: opportunity.createdBy,
    type: "recruitment",
    title: "New application",
    body: `${player.displayName} applied for ${opportunity.title}.`,
  });
  return id;
}

export async function updateApplicationStatus(
  db: Database,
  actorId: string,
  applicationId: string,
  status: "reviewing" | "accepted" | "declined",
) {
  const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!application) throw new AppError("not_found", "Application not found");
  const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, application.opportunityId));
  await assertOrg(db, actorId, opportunity.organizationId, "org.recruit");
  await db.update(applications).set({ status }).where(eq(applications.id, applicationId));
  const [player] = await db.select().from(profiles).where(eq(profiles.id, application.playerProfileId));
  if (player) {
    await notify(db, {
      userId: player.userId,
      type: "recruitment",
      title: "Application update",
      body: `${opportunity.title} is now ${status}.`,
    });
  }
}

export async function createTeam(db: Database, actorId: string, organizationId: string, name: string, ageGroup?: string) {
  await assertOrg(db, actorId, organizationId, "org.teams");
  const id = newId();
  await db.insert(teams).values({ id, organizationId, name: name.trim(), ageGroup: ageGroup ?? null, createdAt: new Date() });
  return id;
}

export async function affiliateProfile(
  db: Database,
  actorId: string,
  input: { organizationId: string; teamId?: string; profileId: string; role: "player" | "coach" },
) {
  await assertOrg(db, actorId, input.organizationId, "org.teams");
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, input.profileId));
  if (!profile) throw new AppError("not_found", "Profile not found");
  const id = newId();
  await db.insert(affiliations).values({
    id,
    organizationId: input.organizationId,
    teamId: input.teamId ?? null,
    profileId: input.profileId,
    role: input.role,
    verifiedStatus: "not_submitted",
    createdAt: new Date(),
  });
  return id;
}

export async function organizationRoleFor(db: Database, organizationId: string, userId: string) {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")));
  return member ?? null;
}

export async function publishAnnouncement(db: Database, actorId: string, organizationId: string, title: string, body: string) {
  await assertOrg(db, actorId, organizationId, "org.announce");
  const id = newId();
  await db.insert(announcements).values({
    id,
    organizationId,
    title: title.trim(),
    body: body.trim(),
    createdBy: actorId,
    createdAt: new Date(),
  });
  const watchers = await db.select().from(follows).where(and(eq(follows.targetType, "organization"), eq(follows.targetId, organizationId)));
  for (const watcher of watchers) {
    await notify(db, { userId: watcher.followerUserId, type: "organization", title, body: body.trim().slice(0, 120) });
  }
  await audit(db, actorId, "organization.announcement", "organization", organizationId, { announcementId: id });
  return id;
}

export async function listAnnouncements(db: Database, organizationId: string) {
  return db.select().from(announcements).where(eq(announcements.organizationId, organizationId));
}

export async function listOpportunities(db: Database, organizationId?: string) {
  const rows = await db.select().from(opportunities);
  return organizationId ? rows.filter((row) => row.organizationId === organizationId) : rows;
}

export async function playerOwner(db: Database, profileId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId));
  if (!profile) return null;
  return mustUser(db, profile.userId);
}
