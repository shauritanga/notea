import { eq } from "drizzle-orm";
import { businesses, campaigns } from "@/db/schema";
import { assertAccount, assertBusiness, assertPlatform, audit } from "@/domain/access";
import { newId } from "@/domain/crypto";
import type { Database } from "@/domain/db";
import { AppError } from "@/domain/errors";

export type CampaignView = typeof campaigns.$inferSelect;

function isLive(campaign: CampaignView, now: Date) {
  if (campaign.status !== "approved") return false;
  if (campaign.startsAt && campaign.startsAt > now) return false;
  if (campaign.endsAt && campaign.endsAt < now) return false;
  if (campaign.ownerType === "business" && campaign.paymentStatus !== "paid") return false;
  return true;
}

export async function createKairukiCampaign(
  db: Database,
  actorId: string,
  input: { name: string; body: string; placement: "feed_top" | "feed_inline"; startsAt?: Date; endsAt?: Date },
) {
  await assertPlatform(db, actorId, "sponsor.manage");
  const id = newId();
  await db.insert(campaigns).values({
    id,
    ownerType: "sponsor",
    sponsorKey: "kairuki",
    name: input.name.trim(),
    body: input.body.trim(),
    kind: "educational",
    placement: input.placement,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    status: "approved",
    paymentStatus: "not_required",
    impressions: 0,
    clicks: 0,
    createdBy: actorId,
    createdAt: new Date(),
  });
  await audit(db, actorId, "sponsor.campaign.created", "campaign", id, { sponsor: "kairuki" });
  return id;
}

export async function createBusinessCampaign(
  db: Database,
  actorId: string,
  input: { businessId: string; name: string; body: string; placement: "feed_top" | "feed_inline"; startsAt?: Date; endsAt?: Date },
) {
  await assertBusiness(db, actorId, input.businessId, "biz.ads");
  const id = newId();
  await db.insert(campaigns).values({
    id,
    ownerType: "business",
    businessId: input.businessId,
    name: input.name.trim(),
    body: input.body.trim(),
    kind: "advertising",
    placement: input.placement,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    status: "pending_approval",
    paymentStatus: "unpaid",
    impressions: 0,
    clicks: 0,
    createdBy: actorId,
    createdAt: new Date(),
  });
  return id;
}

export async function markCampaignPaid(db: Database, actorId: string, campaignId: string, paymentRef: string) {
  const campaign = await mustCampaign(db, campaignId);
  if (campaign.ownerType !== "business" || !campaign.businessId) throw new AppError("not_business_ad", "This campaign is not a business advertisement");
  await assertBusiness(db, actorId, campaign.businessId, "biz.ads");
  await db.update(campaigns).set({ paymentStatus: "paid", paymentRef }).where(eq(campaigns.id, campaignId));
  await audit(db, actorId, "ads.payment", "campaign", campaignId, { paymentRef });
}

export async function reviewBusinessCampaign(
  db: Database,
  actorId: string,
  campaignId: string,
  decision: "approved" | "rejected",
) {
  await assertPlatform(db, actorId, "ads.manage");
  const campaign = await mustCampaign(db, campaignId);
  if (campaign.ownerType !== "business") throw new AppError("not_business_ad", "Use the sponsor workspace for Kairuki content");
  if (decision === "approved" && campaign.paymentStatus !== "paid") {
    throw new AppError("payment_required", "Paid advertising needs a recorded payment before approval");
  }
  await db.update(campaigns).set({ status: decision }).where(eq(campaigns.id, campaignId));
  await audit(db, actorId, "ads.decision", "campaign", campaignId, { decision });
}

export async function campaignReport(db: Database, actorId: string, campaignId: string) {
  await assertPlatform(db, actorId, "ads.report");
  const campaign = await mustCampaign(db, campaignId);
  return { id: campaign.id, name: campaign.name, impressions: campaign.impressions, clicks: campaign.clicks, status: campaign.status };
}

export async function recordCampaignClick(db: Database, campaignId: string) {
  const campaign = await mustCampaign(db, campaignId);
  await db.update(campaigns).set({ clicks: campaign.clicks + 1 }).where(eq(campaigns.id, campaignId));
}

export async function liveCampaigns(db: Database, now: Date) {
  const rows = await db.select().from(campaigns);
  return rows.filter((row) => isLive(row, now));
}

export async function recordImpression(db: Database, campaignId: string) {
  const campaign = await mustCampaign(db, campaignId);
  await db.update(campaigns).set({ impressions: campaign.impressions + 1 }).where(eq(campaigns.id, campaignId));
}

export async function listSponsorCampaigns(db: Database, actorId: string) {
  await assertPlatform(db, actorId, "sponsor.manage");
  const rows = await db.select().from(campaigns);
  return rows.filter((row) => row.sponsorKey === "kairuki");
}

export async function listBusinessCampaigns(db: Database, actorId: string, businessId: string) {
  await assertBusiness(db, actorId, businessId, "biz.ads");
  const rows = await db.select().from(campaigns);
  return rows.filter((row) => row.businessId === businessId);
}

async function mustCampaign(db: Database, id: string) {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
  if (!campaign) throw new AppError("not_found", "Campaign not found");
  return campaign;
}

export async function businessName(db: Database, businessId: string) {
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
  return business?.name ?? "Business";
}

export async function assertCanUsePlatformRead(db: Database, actorId: string) {
  return assertAccount(db, actorId, "read");
}
