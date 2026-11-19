import { eq } from "drizzle-orm";
import {
  auditLogs,
  businesses,
  organizations,
  platformRoles,
  postReports,
  posts,
  profiles,
  users,
  videos,
  campaigns,
} from "@/db/schema";
import { assertPlatform, audit, mustUser } from "@/domain/access";
import { newId } from "@/domain/crypto";
import type { Database } from "@/domain/db";
import { AppError } from "@/domain/errors";
import { notify } from "@/domain/notify";
import { isPlatformRole } from "@/domain/permissions";
import type { AccountStatus, PlatformRoleName } from "@/domain/types";

export async function bootstrapSuperAdmin(db: Database, userId: string) {
  await mustUser(db, userId);
  const existing = await db.select().from(platformRoles).where(eq(platformRoles.role, "super_admin"));
  if (existing.some((row) => row.status === "active")) throw new AppError("bootstrap_closed", "A super admin already exists");
  await db.insert(platformRoles).values({
    id: newId(),
    userId,
    role: "super_admin",
    status: "active",
    grantedBy: null,
    createdAt: new Date(),
  });
  await audit(db, null, "platform.role.bootstrap", "user", userId, { role: "super_admin" });
}

export async function grantPlatformRole(db: Database, actorId: string, userId: string, role: PlatformRoleName) {
  await assertPlatform(db, actorId, "roles.grant_platform");
  if (!isPlatformRole(role)) throw new AppError("invalid_role", "Unknown platform role");
  if (actorId === userId) throw new AppError("self_grant", "You cannot grant yourself a platform role");
  await mustUser(db, userId);
  const existing = await db
    .select()
    .from(platformRoles)
    .where(eq(platformRoles.userId, userId));
  const match = existing.find((row) => row.role === role);
  if (match) {
    await db.update(platformRoles).set({ status: "active", grantedBy: actorId }).where(eq(platformRoles.id, match.id));
  } else {
    await db.insert(platformRoles).values({
      id: newId(),
      userId,
      role,
      status: "active",
      grantedBy: actorId,
      createdAt: new Date(),
    });
  }
  await audit(db, actorId, "platform.role.grant", "user", userId, { role });
  await notify(db, { userId, type: "account", title: "Platform role", body: `You now have the ${role.replaceAll("_", " ")} role.` });
}

export async function revokePlatformRole(db: Database, actorId: string, userId: string, role: PlatformRoleName) {
  await assertPlatform(db, actorId, "roles.grant_platform");
  if (role === "super_admin") {
    const supers = await db.select().from(platformRoles).where(eq(platformRoles.role, "super_admin"));
    if (supers.filter((row) => row.status === "active").length < 2) throw new AppError("last_admin", "Keep at least one super admin");
  }
  const rows = await db.select().from(platformRoles).where(eq(platformRoles.userId, userId));
  const match = rows.find((row) => row.role === role && row.status === "active");
  if (!match) throw new AppError("not_found", "That role is not active");
  await db.update(platformRoles).set({ status: "revoked" }).where(eq(platformRoles.id, match.id));
  await audit(db, actorId, "platform.role.revoke", "user", userId, { role });
}

export async function setAccountStatus(db: Database, actorId: string, userId: string, status: AccountStatus) {
  if (status === "pending_verification") throw new AppError("invalid_status", "Verification sets that status");
  if (status === "active") await assertPlatform(db, actorId, "users.recover");
  else await assertPlatform(db, actorId, "users.manage_status");
  await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, userId));
  await audit(db, actorId, "account.status", "user", userId, { status });
}

export async function getAdminUser(db: Database, actorId: string, userId: string) {
  const roles = await assertPlatform(db, actorId, "users.read");
  const user = await mustUser(db, userId);
  const sensitive = (await import("@/domain/permissions")).platformCan(roles, "users.read_sensitive");
  return {
    id: user.id,
    name: user.name,
    status: user.status,
    language: user.language,
    isMinor: user.isMinor,
    phone: sensitive ? user.phone : null,
    email: sensitive ? user.email : null,
    deletionRequestedAt: user.deletionRequestedAt,
  };
}

export async function listUsers(db: Database, actorId: string) {
  await assertPlatform(db, actorId, "users.read");
  const rows = await db.select().from(users);
  return rows.map((user) => ({ id: user.id, name: user.name, status: user.status, language: user.language }));
}

export async function anonymizeUser(db: Database, actorId: string, userId: string) {
  await assertPlatform(db, actorId, "users.erase");
  const user = await mustUser(db, userId);
  if (!user.deletionRequestedAt) throw new AppError("not_requested", "The member has not asked to be deleted");
  await db
    .update(users)
    .set({
      name: "Removed member",
      email: null,
      phone: null,
      passwordHash: "scrypt$erased$00",
      status: "deactivated",
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  await db.update(profiles).set({ displayName: "Removed member", bio: "", contactPhone: null, contactEmail: null, preciseLocation: null, visibility: "private" }).where(eq(profiles.userId, userId));
  await audit(db, actorId, "account.erased", "user", userId);
}

export async function moderationQueue(db: Database, actorId: string) {
  await assertPlatform(db, actorId, "content.moderate");
  const reports = await db.select().from(postReports);
  const allPosts = await db.select().from(posts);
  return reports.map((report) => {
    const post = allPosts.find((item) => item.id === report.postId);
    return {
      ...report,
      publisherLabel: post?.publisherLabel ?? "",
      body: post?.body ?? "",
    };
  });
}

export async function moderatePost(db: Database, actorId: string, reportId: string, decision: "removed" | "dismissed") {
  await assertPlatform(db, actorId, "content.moderate");
  const [report] = await db.select().from(postReports).where(eq(postReports.id, reportId));
  if (!report) throw new AppError("not_found", "Report not found");
  await db.update(postReports).set({ status: decision }).where(eq(postReports.id, reportId));
  if (decision === "removed") await db.update(posts).set({ status: "removed" }).where(eq(posts.id, report.postId));
  await audit(db, actorId, "content.moderated", "post", report.postId, { decision });
}

export async function analytics(db: Database, actorId: string) {
  await assertPlatform(db, actorId, "analytics.read");
  const userRows = await db.select().from(users);
  const postRows = await db.select().from(posts);
  const orgRows = await db.select().from(organizations);
  const businessRows = await db.select().from(businesses);
  const campaignRows = await db.select().from(campaigns);
  const videoRows = await db.select().from(videos);
  return {
    users: userRows.length,
    activeUsers: userRows.filter((user) => user.status === "active").length,
    posts: postRows.filter((post) => post.status === "published").length,
    organizations: orgRows.length,
    businesses: businessRows.length,
    videos: videoRows.length,
    impressions: campaignRows.reduce((sum, row) => sum + row.impressions, 0),
    clicks: campaignRows.reduce((sum, row) => sum + row.clicks, 0),
  };
}

export async function listAudit(db: Database, actorId: string) {
  await assertPlatform(db, actorId, "audit.read");
  return db.select().from(auditLogs);
}
