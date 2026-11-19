import { and, eq } from "drizzle-orm";
import { organizationMembers, organizations } from "@/db/schema";
import { setActiveContext } from "@/domain/accounts";
import { assertAccount, assertCanAssignOrg, assertOrg, audit, mustUser } from "@/domain/access";
import { newId } from "@/domain/crypto";
import type { Database } from "@/domain/db";
import { AppError } from "@/domain/errors";
import { notify } from "@/domain/notify";
import { orgCategories, type OrgCategory, type OrgRole } from "@/domain/types";

export async function registerOrganization(
  db: Database,
  actorId: string,
  input: {
    name: string;
    category: OrgCategory;
    description: string;
    country?: string;
    region: string;
    contactPhone?: string;
    contactEmail?: string;
    logoUrl?: string;
    coverUrl?: string;
    representativeName?: string;
    representativePhone?: string;
    level?: string;
    section?: string;
  },
) {
  const actor = await assertAccount(db, actorId, "write");
  if (!orgCategories.includes(input.category)) throw new AppError("invalid_category", "Choose a club, academy, team, or association");
  if (input.name.trim().length < 2) throw new AppError("name_required", "Add the organization name");
  if (!input.region.trim()) throw new AppError("region_required", "Add the operating region");
  const id = newId();
  await db.insert(organizations).values({
    id,
    name: input.name.trim(),
    category: input.category,
    description: input.description.trim(),
    country: input.country?.trim() || "Tanzania",
    region: input.region.trim(),
    contactPhone: input.contactPhone ?? null,
    contactEmail: input.contactEmail ?? null,
    logoUrl: input.logoUrl ?? null,
    coverUrl: input.coverUrl ?? null,
    verifiedStatus: "not_submitted",
    level: input.level ?? null,
    section: input.section ?? null,
    representativeName: input.representativeName?.trim() || actor.name,
    representativePhone: input.representativePhone ?? actor.phone,
    createdBy: actorId,
    createdAt: new Date(),
  });
  await db.insert(organizationMembers).values({
    id: newId(),
    organizationId: id,
    userId: actorId,
    role: "owner",
    status: "active",
    createdAt: new Date(),
  });
  await audit(db, actorId, "organization.created", "organization", id, { role: "owner" });
  await setActiveContext(db, actorId, { kind: "organization", id });
  return publicOrganization(await loadOrg(db, id));
}

async function loadOrg(db: Database, id: string) {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
  if (!org) throw new AppError("not_found", "Organization not found");
  return org;
}

export function publicOrganization<T extends { contactPhone: string | null; contactEmail: string | null; verifiedStatus: string }>(org: T) {
  return {
    ...org,
    contactPhone: null,
    contactEmail: null,
    verified: org.verifiedStatus === "approved",
  };
}

export async function getOrganization(db: Database, id: string, viewerId?: string) {
  const org = await loadOrg(db, id);
  if (!viewerId) return publicOrganization(org);
  try {
    await assertOrg(db, viewerId, id, "org.read_private");
    return { ...org, verified: org.verifiedStatus === "approved" };
  } catch {
    return publicOrganization(org);
  }
}

export async function listOrganizations(db: Database) {
  const rows = await db.select().from(organizations);
  return rows.map((org) => publicOrganization(org));
}

export async function assignOrganizationRole(
  db: Database,
  actorId: string,
  input: { organizationId: string; userId: string; role: OrgRole },
) {
  await assertCanAssignOrg(db, actorId, input.organizationId, input.role);
  await mustUser(db, input.userId);
  const existing = await db
    .select()
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, input.organizationId), eq(organizationMembers.userId, input.userId)));
  if (existing[0]) {
    await db
      .update(organizationMembers)
      .set({ role: input.role, status: "active" })
      .where(eq(organizationMembers.id, existing[0].id));
  } else {
    await db.insert(organizationMembers).values({
      id: newId(),
      organizationId: input.organizationId,
      userId: input.userId,
      role: input.role,
      status: "active",
      createdAt: new Date(),
    });
  }
  await audit(db, actorId, "organization.role.grant", "organization", input.organizationId, {
    userId: input.userId,
    role: input.role,
  });
  await notify(db, {
    userId: input.userId,
    type: "account",
    title: "Organization role",
    body: `You are now ${input.role.replaceAll("_", " ")} of an organization.`,
  });
}

export async function revokeOrganizationRole(db: Database, actorId: string, organizationId: string, userId: string) {
  const actor = await assertOrg(db, actorId, organizationId, "org.members");
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")));
  if (!member) throw new AppError("not_found", "That member was not found");
  if (member.role === "owner" && actor.role !== "owner") throw new AppError("forbidden", "Only an owner can revoke an owner");
  if (member.role === "owner") {
    const owners = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.role, "owner"), eq(organizationMembers.status, "active")));
    if (owners.length < 2) throw new AppError("last_owner", "The organization needs an owner");
  }
  await db.update(organizationMembers).set({ status: "revoked" }).where(eq(organizationMembers.id, member.id));
  await audit(db, actorId, "organization.role.revoke", "organization", organizationId, { userId, role: member.role });
}

export async function listOrganizationMembers(db: Database, actorId: string, organizationId: string) {
  await assertOrg(db, actorId, organizationId, "org.manage");
  return db.select().from(organizationMembers).where(eq(organizationMembers.organizationId, organizationId));
}
