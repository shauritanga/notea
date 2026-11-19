import { and, eq } from "drizzle-orm";
import { businessMembers, businesses, enquiries, products, profiles } from "@/db/schema";
import { setActiveContext } from "@/domain/accounts";
import { assertAccount, assertBusiness, assertCanAssignBusiness, audit, mustUser } from "@/domain/access";
import { newId } from "@/domain/crypto";
import type { Database } from "@/domain/db";
import { AppError } from "@/domain/errors";
import { notify } from "@/domain/notify";
import { defaultPrivacy, type BusinessRole, type SocialLinks } from "@/domain/types";

const categories = ["kit", "health", "media", "food", "training", "transport", "other"];

export async function registerBusiness(
  db: Database,
  actorId: string,
  input: {
    name: string;
    category: string;
    description: string;
    location: string;
    region?: string;
    contactPhone?: string;
    contactEmail?: string;
    logoUrl?: string;
    coverUrl?: string;
    website?: string;
    whatsapp?: string;
    socialLinks?: SocialLinks;
    products?: { name: string; description?: string; priceLabel?: string }[];
  },
) {
  const actor = await assertAccount(db, actorId, "write");
  if (!categories.includes(input.category)) throw new AppError("invalid_category", "Choose a business category");
  if (input.name.trim().length < 2 || input.location.trim().length < 2) {
    throw new AppError("details_required", "Add the business name and location");
  }
  const businessId = newId();
  const profileId = newId();
  await db.insert(profiles).values({
    id: profileId,
    userId: actorId,
    type: "business",
    displayName: input.name.trim(),
    bio: input.description.trim(),
    region: input.region ?? null,
    visibility: "public",
    privacy: defaultPrivacy(),
    createdAt: new Date(),
  });
  await db.insert(businesses).values({
    id: businessId,
    name: input.name.trim(),
    category: input.category,
    description: input.description.trim(),
    location: input.location.trim(),
    region: input.region ?? null,
    contactPhone: input.contactPhone ?? null,
    contactEmail: input.contactEmail ?? null,
    logoUrl: input.logoUrl ?? null,
    coverUrl: input.coverUrl ?? null,
    website: input.website ?? null,
    whatsapp: input.whatsapp ?? null,
    socialLinks: input.socialLinks ?? {},
    verifiedStatus: "not_submitted",
    showPublicContact: false,
    profileId,
    createdBy: actorId,
    createdAt: new Date(),
  });
  await db.insert(businessMembers).values({
    id: newId(),
    businessId,
    userId: actorId,
    role: "owner",
    status: "active",
    createdAt: new Date(),
  });
  for (const product of input.products ?? []) {
    await addProduct(db, actorId, businessId, product);
  }
  await audit(db, actorId, "business.created", "business", businessId, { role: "owner" });
  await setActiveContext(db, actorId, { kind: "business", id: businessId });
  const created = await loadBusiness(db, businessId);
  return presentBusiness(created, false);
}

async function loadBusiness(db: Database, id: string) {
  const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
  if (!business) throw new AppError("not_found", "Business not found");
  return business;
}

export function presentBusiness<T extends {
  contactPhone: string | null;
  contactEmail: string | null;
  preciseLocation: string | null;
  showPublicContact: boolean;
  verifiedStatus: string;
}>(business: T, canSeePrivate: boolean) {
  const show = canSeePrivate || business.showPublicContact;
  return {
    ...business,
    contactPhone: show ? business.contactPhone : null,
    contactEmail: show ? business.contactEmail : null,
    preciseLocation: canSeePrivate ? business.preciseLocation : null,
    verified: business.verifiedStatus === "approved",
  };
}

export async function getBusiness(db: Database, id: string, viewerId?: string) {
  const business = await loadBusiness(db, id);
  if (!viewerId) return presentBusiness(business, false);
  try {
    await assertBusiness(db, viewerId, id, "biz.private");
    return presentBusiness(business, true);
  } catch {
    return presentBusiness(business, false);
  }
}

export async function listBusinesses(db: Database) {
  const rows = await db.select().from(businesses);
  return rows.map((business) => presentBusiness(business, false));
}

export async function addProduct(
  db: Database,
  actorId: string,
  businessId: string,
  input: { name: string; description?: string; priceLabel?: string },
) {
  await assertBusiness(db, actorId, businessId, "biz.products");
  const id = newId();
  await db.insert(products).values({
    id,
    businessId,
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    priceLabel: input.priceLabel ?? null,
  });
  return id;
}

export async function listProducts(db: Database, businessId: string) {
  return db.select().from(products).where(eq(products.businessId, businessId));
}

export async function assignBusinessRole(
  db: Database,
  actorId: string,
  input: { businessId: string; userId: string; role: BusinessRole },
) {
  await assertCanAssignBusiness(db, actorId, input.businessId, input.role);
  await mustUser(db, input.userId);
  const existing = await db
    .select()
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, input.businessId), eq(businessMembers.userId, input.userId)));
  if (existing[0]) {
    await db.update(businessMembers).set({ role: input.role, status: "active" }).where(eq(businessMembers.id, existing[0].id));
  } else {
    await db.insert(businessMembers).values({
      id: newId(),
      businessId: input.businessId,
      userId: input.userId,
      role: input.role,
      status: "active",
      createdAt: new Date(),
    });
  }
  await audit(db, actorId, "business.role.grant", "business", input.businessId, { userId: input.userId, role: input.role });
  await notify(db, {
    userId: input.userId,
    type: "account",
    title: "Business role",
    body: `You can now work on a business as ${input.role.replaceAll("_", " ")}.`,
  });
}

export async function revokeBusinessRole(db: Database, actorId: string, businessId: string, userId: string) {
  const actor = await assertBusiness(db, actorId, businessId, "biz.members");
  const [member] = await db
    .select()
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, userId), eq(businessMembers.status, "active")));
  if (!member) throw new AppError("not_found", "That member was not found");
  if (member.role === "owner" && actor.role !== "owner") throw new AppError("forbidden", "Only an owner can revoke an owner");
  if (member.role === "owner") {
    const owners = await db
      .select()
      .from(businessMembers)
      .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.role, "owner"), eq(businessMembers.status, "active")));
    if (owners.length < 2) throw new AppError("last_owner", "The business needs an owner");
  }
  await db.update(businessMembers).set({ status: "revoked" }).where(eq(businessMembers.id, member.id));
  await audit(db, actorId, "business.role.revoke", "business", businessId, { userId, role: member.role });
}

export async function sendEnquiry(db: Database, actorId: string, businessId: string, message: string) {
  await assertAccount(db, actorId, "write");
  const business = await loadBusiness(db, businessId);
  if (!message.trim()) throw new AppError("message_required", "Write a short message");
  const id = newId();
  await db.insert(enquiries).values({
    id,
    businessId,
    fromUserId: actorId,
    message: message.trim(),
    status: "open",
    createdAt: new Date(),
  });
  const members = await db.select().from(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.status, "active")));
  for (const member of members) {
    if (member.role === "content_manager") continue;
    await notify(db, {
      userId: member.userId,
      type: "business",
      title: "New enquiry",
      body: `${business.name} received a new enquiry.`,
    });
  }
  return id;
}

export async function listEnquiries(db: Database, actorId: string, businessId: string) {
  await assertBusiness(db, actorId, businessId, "biz.enquiries");
  return db.select().from(enquiries).where(eq(enquiries.businessId, businessId));
}

export async function businessProfiles(db: Database, userId: string) {
  return db.select().from(profiles).where(and(eq(profiles.userId, userId), eq(profiles.type, "business")));
}
