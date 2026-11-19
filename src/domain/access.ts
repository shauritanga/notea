import { and, eq } from "drizzle-orm";
import {
  auditLogs,
  businessMembers,
  organizationMembers,
  platformRoles,
  users,
} from "@/db/schema";
import type { Database } from "@/domain/db";
import { AppError } from "@/domain/errors";
import { newId } from "@/domain/crypto";
import {
  businessCan,
  canAssignBusinessRole,
  canAssignOrgRole,
  orgCan,
  platformCan,
  type BusinessPermission,
  type OrgPermission,
  type PlatformPermission,
} from "@/domain/permissions";
import type { BusinessRole, OrgRole } from "@/domain/types";

export async function mustUser(db: Database, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError("not_found", "Account not found");
  return user;
}

export async function assertAccount(db: Database, userId: string, mode: "read" | "write") {
  const user = await mustUser(db, userId);
  if (user.status === "suspended" || user.status === "deactivated") {
    throw new AppError("account_blocked", "This account cannot be used right now");
  }
  if (user.status === "pending_verification" || (!user.phoneVerifiedAt && !user.emailVerifiedAt)) {
    throw new AppError("verification_required", "Verify your phone number or email first");
  }
  if (mode === "write" && user.status === "restricted") {
    throw new AppError("restricted", "This account can look, but it cannot publish");
  }
  return user;
}

export async function audit(
  db: Database,
  actorUserId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  await db.insert(auditLogs).values({
    id: newId(),
    actorUserId,
    action,
    entityType,
    entityId,
    metadata,
    createdAt: new Date(),
  });
}

export async function activePlatformRoles(db: Database, userId: string) {
  const rows = await db
    .select()
    .from(platformRoles)
    .where(and(eq(platformRoles.userId, userId), eq(platformRoles.status, "active")));
  return rows.map((row) => row.role);
}

export async function assertPlatform(db: Database, userId: string, permission: PlatformPermission) {
  await assertAccount(db, userId, "read");
  const roles = await activePlatformRoles(db, userId);
  if (!platformCan(roles, permission)) throw new AppError("forbidden", "You do not have permission for that");
  return roles;
}

export async function activeOrgMember(db: Database, organizationId: string, userId: string) {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.status, "active"),
      ),
    );
  return member ?? null;
}

export async function assertOrg(db: Database, userId: string, organizationId: string, permission: OrgPermission) {
  await assertAccount(db, userId, permission === "org.read_private" ? "read" : "write");
  const member = await activeOrgMember(db, organizationId, userId);
  if (!member || !orgCan(member.role as OrgRole, permission)) {
    throw new AppError("forbidden", "Your organization role does not allow that");
  }
  return member;
}

export async function assertCanAssignOrg(db: Database, actorId: string, organizationId: string, role: OrgRole) {
  const member = await assertOrg(db, actorId, organizationId, "org.members");
  if (!canAssignOrgRole(member.role as OrgRole, role)) {
    throw new AppError("forbidden", "You cannot assign that organization role");
  }
  return member;
}

export async function activeBusinessMember(db: Database, businessId: string, userId: string) {
  const [member] = await db
    .select()
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.userId, userId),
        eq(businessMembers.status, "active"),
      ),
    );
  return member ?? null;
}

export async function assertBusiness(db: Database, userId: string, businessId: string, permission: BusinessPermission) {
  await assertAccount(db, userId, permission === "biz.private" ? "read" : "write");
  const member = await activeBusinessMember(db, businessId, userId);
  if (!member || !businessCan(member.role as BusinessRole, permission)) {
    throw new AppError("forbidden", "Your business role does not allow that");
  }
  return member;
}

export async function assertCanAssignBusiness(db: Database, actorId: string, businessId: string, role: BusinessRole) {
  const member = await assertBusiness(db, actorId, businessId, "biz.members");
  if (!canAssignBusinessRole(member.role as BusinessRole, role)) {
    throw new AppError("forbidden", "You cannot assign that business role");
  }
  return member;
}
