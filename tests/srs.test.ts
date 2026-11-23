import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { auditLogs, sessions, verificationCodes } from "@/db/schema";
import {
  activePlatformRoles,
} from "@/domain/access";
import {
  addProfile,
  changePassword,
  completeOnboarding,
  deactivateAccount,
  isMinorDob,
  login,
  presentProfile,
  publicProfile,
  recoverAccount,
  registerIndividual,
  requestDeletion,
  requestPasswordReset,
  requestRecoveryCode,
  resetPasswordWithCode,
  setActiveContext,
  updateAccountSettings,
  updateProfile,
  userFromToken,
  verifyContact,
} from "@/domain/accounts";
import {
  analytics,
  anonymizeUser,
  bootstrapSuperAdmin,
  getAdminUser,
  grantPlatformRole,
  listAudit,
  moderatePost,
  moderationQueue,
  revokePlatformRole,
  setAccountStatus,
} from "@/domain/admin";
import { AppError } from "@/domain/errors";
import {
  assignBusinessRole,
  getBusiness,
  listBusinesses,
  listEnquiries,
  registerBusiness,
  revokeBusinessRole,
  sendEnquiry,
} from "@/domain/businesses";
import {
  campaignReport,
  createBusinessCampaign,
  createKairukiCampaign,
  markCampaignPaid,
  recordCampaignClick,
  reviewBusinessCampaign,
} from "@/domain/campaigns";
import {
  GoogleYouTubePublisher,
  authorizePlayerYouTube,
  mirrorToOfficialYouTube,
  publishToYouTube,
  readStoredVideo,
  retryYouTube,
  selectRendition,
  uploadVideo,
} from "@/domain/media";
import { listNotifications } from "@/domain/notify";
import { platformCan } from "@/domain/permissions";
import {
  assignOrganizationRole,
  getOrganization,
  listOrganizations,
  registerOrganization,
  revokeOrganizationRole,
} from "@/domain/organizations";
import {
  followTarget,
  getFeed,
  likePost,
  commentOnPost,
  publishPost,
  reportPost,
  savePost,
  searchAll,
  sharePost,
} from "@/domain/social";
import {
  addHighlight,
  addToShortlist,
  affiliateProfile,
  applyToOpportunity,
  createOpportunity,
  createShortlist,
  createTeam,
  listHighlights,
  organizationRoleFor,
  publishAnnouncement,
  searchPlayers,
  updateApplicationStatus,
} from "@/domain/talent";
import { videoPlayback } from "@/domain/types";
import {
  getVerificationCase,
  listVerificationQueue,
  reviewVerification,
  submitVerification,
} from "@/domain/verification";
import { createTestDatabase, verifiedPerson } from "./helpers";
import type { Database } from "@/domain/db";

let db: Database;
let close: () => Promise<void>;

beforeEach(async () => {
  const created = await createTestDatabase();
  db = created.db;
  close = created.close;
});

afterEach(async () => {
  await close();
});

async function onboard(userId: string, profileTypes: Array<"fan" | "player" | "coach" | "scout"> = ["fan"], extra: Record<string, unknown> = {}) {
  return completeOnboarding(db, userId, {
    language: "sw",
    interests: ["training"],
    regions: ["Arusha"],
    profileTypes,
    ...extra,
  });
}

describe("SRS acceptance", () => {
  it("lets a person, club, and business register without approval or a badge", async () => {
    const person = await verifiedPerson(db, { name: "Neema" });
    expect(person.user.status).toBe("active");
    expect(await activePlatformRoles(db, person.user.id)).toEqual([]);
    const org = await registerOrganization(db, person.user.id, {
      name: "Arusha United",
      category: "club",
      description: "Community club",
      region: "Arusha",
      logoUrl: "/logo.png",
      coverUrl: "/cover.png",
      representativeName: "Neema",
    });
    expect(org.verified).toBe(false);
    expect(org.verifiedStatus).toBe("not_submitted");
    const shop = await registerBusiness(db, person.user.id, {
      name: "Pitch Kit",
      category: "kit",
      description: "Boots and shirts",
      location: "Arusha",
      products: [{ name: "Boots", priceLabel: "TZS 85000" }],
    });
    expect(shop.verified).toBe(false);
    expect((await listOrganizations(db)).some((item) => item.name === "Arusha United")).toBe(true);
    expect((await listBusinesses(db)).some((item) => item.name === "Pitch Kit")).toBe(true);
  });

  it("keeps general actions behind phone or email verification", async () => {
    const pending = await registerIndividual(db, {
      name: "Juma",
      password: "secret-pass-1",
      phone: "+255700000099",
      termsAccepted: true,
    });
    expect(pending.user.status).toBe("pending_verification");
    expect(pending.user.passwordHash.startsWith("scrypt$")).toBe(true);
    expect(pending.user.passwordHash).not.toContain("secret-pass-1");
    const [session] = await db.select().from(sessions).where(eq(sessions.userId, pending.user.id));
    expect(session.tokenHash).not.toBe(pending.token);
    const [codeRow] = await db.select().from(verificationCodes).where(eq(verificationCodes.userId, pending.user.id));
    expect(codeRow.codeHash).not.toBe(pending.codes.phone);
    await expect(publishPost(db, pending.user.id, { kind: "text", body: "Too early" })).rejects.toMatchObject({
      code: "verification_required",
    });
    await expect(verifyContact(db, pending.user.id, "000000")).rejects.toMatchObject({ code: "invalid_code" });
    const user = await verifyContact(db, pending.user.id, pending.codes.phone!);
    expect(user.phoneVerifiedAt).toBeTruthy();
    expect(user.status).toBe("active");
  });

  it("collects language, interests, regions, and optional profiles", async () => {
    const fanOnly = await verifiedPerson(db);
    const skipped = await onboard(fanOnly.user.id, []);
    expect(skipped.profileIds).toHaveLength(0);
    expect(skipped.user.language).toBe("sw");
    const player = await verifiedPerson(db, { name: "Amina" });
    const done = await onboard(player.user.id, ["fan", "player"], {
      language: "en",
      interests: ["womens", "grassroots"],
      regions: ["Dar es Salaam"],
      player: { position: "forward", preferredFoot: "left", footballHistory: "School teams", achievements: "Regional cup", level: "amateur", section: "women" },
    });
    expect(done.user.language).toBe("en");
    expect(done.profileIds).toHaveLength(2);
    await updateProfile(db, player.user.id, done.profileIds[1], { footballHistory: "Added later" });
    const shown = await publicProfile(db, done.profileIds[1], "someone-else");
    expect(shown?.footballHistory).toBe("Added later");
    expect(shown?.selfReported).toBe(true);
  });

  it("switches profiles without a new login and names the publisher", async () => {
    const person = await verifiedPerson(db, { name: "Amina" });
    const firstToken = person.token;
    const { profileIds } = await onboard(person.user.id, ["fan", "player"]);
    await setActiveContext(db, person.user.id, { kind: "profile", id: profileIds[1] });
    const asPlayer = await publishPost(db, person.user.id, { kind: "text", body: "My highlight notes", category: "highlight" });
    expect(asPlayer.publisherProfileId).toBe(profileIds[1]);
    expect(asPlayer.publisherLabel).toBe("Amina");
    await setActiveContext(db, person.user.id, { kind: "profile", id: profileIds[0] });
    const asFan = await publishPost(db, person.user.id, { kind: "text", body: "What a match", category: "match" });
    expect(asFan.publisherProfileId).toBe(profileIds[0]);
    expect(asFan.authorUserId).toBe(person.user.id);
    const still = await userFromToken(db, firstToken);
    expect(still?.id).toBe(person.user.id);
    await updateProfile(db, person.user.id, profileIds[1], { privacy: { showContact: true }, contactPhone: "+255711111111" });
    const fan = await publicProfile(db, profileIds[0], person.user.id);
    const athlete = await publicProfile(db, profileIds[1], person.user.id);
    expect(fan?.contactPhone).toBeNull();
    expect(athlete?.contactPhone).toBe("+255711111111");
  });

  it("lets owners invite and revoke administrators", async () => {
    const owner = await verifiedPerson(db, { name: "Owner" });
    const admin = await verifiedPerson(db, { name: "Admin" });
    await onboard(owner.user.id, ["fan"]);
    await onboard(admin.user.id, ["fan"]);
    const org = await registerOrganization(db, owner.user.id, {
      name: "Simba Academy",
      category: "academy",
      description: "Youth academy",
      region: "Dar es Salaam",
    });
    await assignOrganizationRole(db, owner.user.id, { organizationId: org.id, userId: admin.user.id, role: "administrator" });
    await revokeOrganizationRole(db, owner.user.id, org.id, admin.user.id);
    await expect(createTeam(db, admin.user.id, org.id, "U17")).rejects.toMatchObject({ code: "forbidden" });
    const rows = await db.select().from(auditLogs);
    expect(rows.some((row) => row.action === "organization.role.revoke")).toBe(true);
  });

  it("distinguishes verified organizations and businesses and records decisions", async () => {
    const owner = await verifiedPerson(db);
    const officer = await verifiedPerson(db, { name: "Officer" });
    await bootstrapSuperAdmin(db, officer.user.id);
    await grantPlatformRole(db, officer.user.id, (await verifiedPerson(db, { name: "Reviewer" })).user.id, "verification_officer");
    const reviewer = await verifiedPerson(db, { name: "Verifier" });
    await grantPlatformRole(db, officer.user.id, reviewer.user.id, "verification_officer");
    const org = await registerOrganization(db, owner.user.id, {
      name: "Women FC",
      category: "club",
      description: "Women's club",
      region: "Mwanza",
      section: "women",
    });
    const applicationId = await submitVerification(db, owner.user.id, {
      subjectType: "organization",
      subjectId: org.id,
      documents: [{ name: "registration.pdf", url: "/docs/registration.pdf" }],
    });
    expect((await getOrganization(db, org.id)).verified).toBe(false);
    await reviewVerification(db, reviewer.user.id, { applicationId, decision: "approved", note: "Documents match" });
    expect((await getOrganization(db, org.id)).verified).toBe(true);
    const queue = await listVerificationQueue(db, reviewer.user.id);
    expect(queue.find((item) => item.id === applicationId)?.status).toBe("approved");
    const detail = await getVerificationCase(db, reviewer.user.id, applicationId);
    expect(detail.documents).toHaveLength(1);
    const audits = await listAudit(db, officer.user.id);
    expect(audits.some((row) => row.action === "verification.decision")).toBe(true);
    expect(audits.some((row) => row.action === "organization.role.grant" || row.action === "organization.created")).toBe(true);
  });

  it("stops a person from granting themselves a platform role", async () => {
    const admin = await verifiedPerson(db, { name: "Ada" });
    const other = await verifiedPerson(db, { name: "Other" });
    await bootstrapSuperAdmin(db, admin.user.id);
    await expect(grantPlatformRole(db, admin.user.id, admin.user.id, "platform_admin")).rejects.toMatchObject({ code: "self_grant" });
    await expect(grantPlatformRole(db, other.user.id, other.user.id, "super_admin")).rejects.toMatchObject({ code: "forbidden" });
    await grantPlatformRole(db, admin.user.id, other.user.id, "platform_admin");
    await revokePlatformRole(db, admin.user.id, other.user.id, "platform_admin");
    await expect(listAudit(db, other.user.id)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("keeps organization, business, and personal permissions apart", async () => {
    const owner = await verifiedPerson(db);
    await onboard(owner.user.id, ["player"]);
    const org = await registerOrganization(db, owner.user.id, {
      name: "Coast Club",
      category: "club",
      description: "Club",
      region: "Tanga",
    });
    const stranger = await verifiedPerson(db);
    await onboard(stranger.user.id, ["player", "coach"]);
    await followTarget(db, stranger.user.id, "organization", org.id);
    const player = (await searchPlayers(db, owner.user.id, {})).find((item) => item.userId === stranger.user.id);
    await affiliateProfile(db, owner.user.id, { organizationId: org.id, profileId: player!.id, role: "player" });
    expect(await organizationRoleFor(db, org.id, stranger.user.id)).toBeNull();
    await expect(createTeam(db, stranger.user.id, org.id, "First")).rejects.toMatchObject({ code: "forbidden" });
    const shop = await registerBusiness(db, stranger.user.id, {
      name: "Sideline",
      category: "food",
      description: "Snacks",
      location: "Tanga",
    });
    await expect(listEnquiries(db, owner.user.id, shop.id)).rejects.toMatchObject({ code: "forbidden" });
    await expect(createBusinessCampaign(db, owner.user.id, { businessId: shop.id, name: "Ad", body: "Buy", placement: "feed_top" })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("supports the account lifecycle and deletion request", async () => {
    const admin = await verifiedPerson(db, { name: "Ada" });
    const support = await verifiedPerson(db, { name: "Support" });
    const member = await verifiedPerson(db, { name: "Member" });
    await bootstrapSuperAdmin(db, admin.user.id);
    await grantPlatformRole(db, admin.user.id, support.user.id, "customer_support");
    await onboard(member.user.id, ["fan"]);
    await setAccountStatus(db, admin.user.id, member.user.id, "restricted");
    const feed = await getFeed(db, member.user.id, "personalized");
    expect(Array.isArray(feed)).toBe(true);
    await expect(publishPost(db, member.user.id, { kind: "text", body: "Nope" })).rejects.toMatchObject({ code: "restricted" });
    await setAccountStatus(db, support.user.id, member.user.id, "active");
    await expect(setAccountStatus(db, support.user.id, member.user.id, "suspended")).rejects.toMatchObject({ code: "forbidden" });
    await setAccountStatus(db, admin.user.id, member.user.id, "suspended");
    await expect(login(db, { identifier: member.email, password: member.password })).rejects.toMatchObject({ code: "account_blocked" });
    await setAccountStatus(db, support.user.id, member.user.id, "active");
    await deactivateAccount(db, member.user.id);
    const recovery = await requestRecoveryCode(db, member.email);
    const recovered = await recoverAccount(db, recovery.userId, recovery.code);
    expect(recovered.status).toBe("active");
    await requestDeletion(db, member.user.id);
    const stored = await getAdminUser(db, support.user.id, member.user.id);
    expect(stored.deletionRequestedAt).toBeTruthy();
    expect(stored.email).toBe(member.email);
    await anonymizeUser(db, admin.user.id, member.user.id);
    const erased = await getAdminUser(db, admin.user.id, member.user.id);
    expect(erased.name).toBe("Removed member");
    expect(erased.email).toBeNull();
  });

  it("resets a forgotten password with a code and signs the person in", async () => {
    const member = await verifiedPerson(db, { name: "Asha Reset" });
    await onboard(member.user.id, ["fan"]);
    const reset = await requestPasswordReset(db, member.email);
    expect(reset.code).toMatch(/^\d{6}$/);
    const next = await resetPasswordWithCode(db, reset.code, "fresh-pass-8");
    expect(next.user.id).toBe(member.user.id);
    expect(await userFromToken(db, next.token)).toMatchObject({ id: member.user.id });
    await expect(login(db, { identifier: member.email, password: member.password })).rejects.toMatchObject({ code: "invalid_login" });
    const signed = await login(db, { identifier: member.email, password: "fresh-pass-8" });
    expect(signed.user.id).toBe(member.user.id);
    await expect(resetPasswordWithCode(db, reset.code, "another-pass-8")).rejects.toMatchObject({ code: "invalid_code" });
  });

  it("hides contact details and protects minors", async () => {
    expect(isMinorDob("2014-01-01", new Date("2026-01-01"))).toBe(true);
    const adult = await verifiedPerson(db, { name: "Adult" });
    const { profileIds } = await onboard(adult.user.id, ["player"]);
    await updateProfile(db, adult.user.id, profileIds[0], {
      contactPhone: "+255722000000",
      preciseLocation: "-6.8,39.2",
    });
    const hidden = await publicProfile(db, profileIds[0], "viewer");
    expect(hidden?.contactPhone).toBeNull();
    expect(hidden?.preciseLocation).toBeNull();
    const youth = await verifiedPerson(db, { name: "Young" });
    await expect(
      onboard(youth.user.id, ["player"], { dateOfBirth: "2015-05-01", player: { position: "goalkeeper" } }),
    ).resolves.toBeTruthy();
    const privateProfile = (await searchPlayers(db, adult.user.id, { query: "Young" }));
    expect(privateProfile).toHaveLength(0);
    const { profileIds: youthIds } = await completeOnboarding(db, (await verifiedPerson(db, { name: "Second" })).user.id, {
      language: "en",
      interests: [],
      regions: ["Dodoma"],
      profileTypes: [],
    });
    expect(youthIds).toHaveLength(0);
    const minor = await verifiedPerson(db, { name: "Minor Player" });
    await completeOnboarding(db, minor.user.id, {
      language: "sw",
      interests: [],
      regions: ["Dodoma"],
      profileTypes: ["player"],
      dateOfBirth: "2015-05-01",
    });
    const minorProfiles = await searchPlayers(db, adult.user.id, {});
    expect(minorProfiles.find((profile) => profile.displayName === "Minor Player")).toBeUndefined();
    await expect(updateAccountSettings(db, minor.user.id, { privacy: { showContact: true } })).rejects.toMatchObject({
      code: "minor_privacy",
    });
  });

  it("runs the football feed, search, and playback contract", async () => {
    const author = await verifiedPerson(db, { name: "Amina" });
    const reader = await verifiedPerson(db, { name: "Fan" });
    await completeOnboarding(db, author.user.id, {
      language: "en",
      interests: ["training"],
      regions: ["Arusha"],
      profileTypes: ["player"],
      player: { position: "midfielder", preferredFoot: "right", level: "grassroots", section: "women" },
    });
    await completeOnboarding(db, reader.user.id, {
      language: "sw",
      interests: ["training"],
      regions: ["Arusha"],
      profileTypes: ["fan"],
    });
    const followed = await publishPost(db, author.user.id, { kind: "text", category: "general", body: "Training notes", region: "Mbeya" });
    await publishPost(db, author.user.id, { kind: "image", category: "training", body: "Session", mediaUrl: "/images/session.jpg", region: "Dar es Salaam" });
    await publishPost(db, author.user.id, { kind: "text", category: "general", body: "Nearby friendly", region: "Arusha" });
    await followTarget(db, reader.user.id, "profile", followed.publisherProfileId!);
    await likePost(db, reader.user.id, followed.id);
    await commentOnPost(db, reader.user.id, followed.id, "Safiri vizuri");
    await sharePost(db, reader.user.id, followed.id);
    await savePost(db, reader.user.id, followed.id);
    const reportId = await reportPost(db, reader.user.id, followed.id, "spam");
    const following = await getFeed(db, reader.user.id, "following");
    expect(following.some((item) => item.kind === "post" && item.post.id === followed.id)).toBe(true);
    const nearby = await getFeed(db, reader.user.id, "nearby");
    expect(nearby.every((item) => item.kind !== "post" || item.post.region === "Arusha")).toBe(true);
    const personal = await getFeed(db, reader.user.id, "personalized");
    expect(personal.some((item) => item.kind === "post" && item.post.category === "training")).toBe(true);
    const trending = await getFeed(db, reader.user.id, "trending");
    expect(trending[0]?.kind === "post" ? trending[0].post.id : "").toBe(followed.id);
    const found = await searchAll(db, reader.user.id, "Amina");
    expect(found.profiles.some((profile) => profile.displayName === "Amina")).toBe(true);
    const players = await searchPlayers(db, reader.user.id, { position: "midfielder", section: "women", preferredFoot: "right", level: "grassroots" });
    expect(players).toHaveLength(1);
    expect(players[0].selfReported).toBe(true);
    const moderator = await verifiedPerson(db, { name: "Mod" });
    const admin = await verifiedPerson(db, { name: "Ada" });
    await bootstrapSuperAdmin(db, admin.user.id);
    await grantPlatformRole(db, admin.user.id, moderator.user.id, "content_moderator");
    const queue = await moderationQueue(db, moderator.user.id);
    expect(queue.some((item) => item.id === reportId)).toBe(true);
    expect(queue.find((item) => item.id === reportId)).not.toHaveProperty("phone");
    await moderatePost(db, moderator.user.id, reportId, "removed");
    const after = await getFeed(db, reader.user.id, "following");
    expect(after.some((item) => item.kind === "post" && item.post.id === followed.id)).toBe(false);
    expect(videoPlayback.autoplay).toBe(true);
    expect(videoPlayback.muted).toBe(true);
    expect(videoPlayback.playsInline).toBe(true);
  });

  it("covers talent, clubs, trials, and highlights", async () => {
    const scoutUser = await verifiedPerson(db, { name: "Scout" });
    const playerUser = await verifiedPerson(db, { name: "Amina" });
    const coachUser = await verifiedPerson(db, { name: "Coach" });
    await onboard(playerUser.user.id, ["player"], { player: { position: "forward", preferredFoot: "both", footballHistory: "Academy", achievements: "Cup" } });
    await onboard(scoutUser.user.id, ["scout"]);
    await onboard(coachUser.user.id, ["coach"]);
    const highlightId = await addHighlight(db, playerUser.user.id, { title: "Goal against Simba", videoUrl: "/videos/goal.mp4" });
    const player = (await searchPlayers(db, scoutUser.user.id, { query: "Amina" }))[0];
    const highlights = await listHighlights(db, player.id);
    expect(highlights.map((item) => item.id)).toContain(highlightId);
    expect(highlights[0].selfReported).toBe(true);
    const shortlistId = await createShortlist(db, scoutUser.user.id, "Watch list");
    await addToShortlist(db, scoutUser.user.id, shortlistId, player.id);
    const org = await registerOrganization(db, coachUser.user.id, {
      name: "Academy Stars",
      category: "academy",
      description: "Development",
      region: "Arusha",
    });
    const teamId = await createTeam(db, coachUser.user.id, org.id, "U15", "U15");
    await affiliateProfile(db, coachUser.user.id, { organizationId: org.id, teamId, profileId: player.id, role: "player" });
    const opportunityId = await createOpportunity(db, coachUser.user.id, {
      organizationId: org.id,
      title: "Open trial",
      kind: "trial",
      description: "Saturday morning",
      region: "Arusha",
    });
    const applicationId = await applyToOpportunity(db, playerUser.user.id, opportunityId);
    await updateApplicationStatus(db, coachUser.user.id, applicationId, "accepted");
    await followTarget(db, playerUser.user.id, "organization", org.id);
    await publishAnnouncement(db, coachUser.user.id, org.id, "Training moved", "Meet at the main pitch.");
    const notes = await listNotifications(db, playerUser.user.id);
    expect(notes.some((note) => note.type === "organization")).toBe(true);
    expect(notes.some((note) => note.type === "recruitment")).toBe(true);
    const application = await submitVerification(db, playerUser.user.id, {
      subjectType: "player",
      subjectId: player.id,
      documents: [{ name: "id.pdf", url: "/docs/id.pdf" }],
    });
    const admin = await verifiedPerson(db);
    await bootstrapSuperAdmin(db, admin.user.id);
    await reviewVerification(db, admin.user.id, { applicationId: application, decision: "more_information_required" });
    const refreshed = await searchPlayers(db, scoutUser.user.id, { query: "Amina" });
    expect(refreshed[0].verified).toBe(false);
    await reviewVerification(db, admin.user.id, { applicationId: application, decision: "approved" });
    expect((await searchPlayers(db, scoutUser.user.id, { verifiedOnly: true, query: "Amina" }))).toHaveLength(1);
  });

  it("runs the business hub, paid ads, and Kairuki placements", async () => {
    const owner = await verifiedPerson(db, { name: "Shop" });
    const marketer = await verifiedPerson(db, { name: "Marketer" });
    const editor = await verifiedPerson(db, { name: "Editor" });
    const sponsor = await verifiedPerson(db, { name: "Sponsor" });
    const ads = await verifiedPerson(db, { name: "Ads" });
    const reader = await verifiedPerson(db, { name: "Reader" });
    await bootstrapSuperAdmin(db, sponsor.user.id);
    await grantPlatformRole(db, sponsor.user.id, ads.user.id, "advertising_manager");
    await grantPlatformRole(db, sponsor.user.id, (await verifiedPerson(db, { name: "Kairuki" })).user.id, "sponsor_manager");
    const kairuki = await verifiedPerson(db, { name: "Hospital" });
    await grantPlatformRole(db, sponsor.user.id, kairuki.user.id, "sponsor_manager");
    await onboard(reader.user.id, ["fan"]);
    const shop = await registerBusiness(db, owner.user.id, {
      name: "Kili Boots",
      category: "kit",
      description: "Football boots",
      location: "Moshi",
      region: "Arusha",
      website: "https://kiliboots.example",
      whatsapp: "https://wa.me/255700000111",
      contactPhone: "+255700000111",
      products: [{ name: "Studs", description: "Firm ground", priceLabel: "TZS 90000" }],
    });
    const listed = await getBusiness(db, shop.id);
    expect(listed.contactPhone).toBeNull();
    expect(listed.website).toContain("kiliboots");
    await assignBusinessRole(db, owner.user.id, { businessId: shop.id, userId: marketer.user.id, role: "marketing_manager" });
    await assignBusinessRole(db, owner.user.id, { businessId: shop.id, userId: editor.user.id, role: "content_manager" });
    await sendEnquiry(db, reader.user.id, shop.id, "Do you have size 42?");
    expect(await listEnquiries(db, marketer.user.id, shop.id)).toHaveLength(1);
    await expect(listEnquiries(db, editor.user.id, shop.id)).rejects.toMatchObject({ code: "forbidden" });
    await revokeBusinessRole(db, owner.user.id, shop.id, marketer.user.id);
    await expect(listEnquiries(db, marketer.user.id, shop.id)).rejects.toMatchObject({ code: "forbidden" });
    await assignBusinessRole(db, owner.user.id, { businessId: shop.id, userId: marketer.user.id, role: "marketing_manager" });
    const adId = await createBusinessCampaign(db, marketer.user.id, {
      businessId: shop.id,
      name: "Boot week",
      body: "New studs",
      placement: "feed_inline",
    });
    await expect(reviewBusinessCampaign(db, ads.user.id, adId, "approved")).rejects.toMatchObject({ code: "payment_required" });
    await markCampaignPaid(db, owner.user.id, adId, "PAY-1");
    await reviewBusinessCampaign(db, ads.user.id, adId, "approved");
    const tomorrow = new Date(Date.now() + 86400000);
    const futureId = await createKairukiCampaign(db, kairuki.user.id, {
      name: "Hydration",
      body: "Drink water at training.",
      placement: "feed_top",
      startsAt: tomorrow,
    });
    const early = await getFeed(db, reader.user.id, "personalized", new Date());
    expect(early.some((item) => item.kind === "campaign" && item.campaign.id === futureId)).toBe(false);
    const liveId = await createKairukiCampaign(db, kairuki.user.id, {
      name: "Warm up",
      body: "Warm up before every session.",
      placement: "feed_top",
    });
    const live = await getFeed(db, reader.user.id, "personalized", new Date());
    expect(live[0]).toMatchObject({ kind: "campaign", campaign: { id: liveId } });
    await recordCampaignClick(db, liveId);
    const report = await campaignReport(db, ads.user.id, liveId);
    expect(report.impressions).toBeGreaterThan(0);
    expect(report.clicks).toBe(1);
    const numbers = await analytics(db, ads.user.id);
    expect(numbers.businesses).toBeGreaterThan(0);
  });

  it("uploads video, chooses a rendition, and publishes to YouTube once", async () => {
    const player = await verifiedPerson(db, { name: "Amina" });
    const admin = await verifiedPerson(db, { name: "Ada" });
    await bootstrapSuperAdmin(db, admin.user.id);
    const { profileIds } = await onboard(player.user.id, ["player"]);
    const video = await uploadVideo(db, player.user.id, {
      title: "Left-foot goal",
      sourceUrl: "https://cdn.notea.test/goal.mp4",
      profileId: profileIds[0],
    });
    expect(video.status).toBe("ready");
    expect(video.thumbnailUrl).toContain(".svg");
    expect(video.renditions).toHaveLength(2);
    expect(selectRendition(video.renditions, 1).quality).toBe("360p");
    expect(selectRendition(video.renditions, 5).quality).toBe("720p");
    const again = await uploadVideo(db, player.user.id, { title: "Left-foot goal", sourceUrl: "https://cdn.notea.test/goal.mp4" });
    expect(again.id).toBe(video.id);
    await expect(publishToYouTube(db, player.user.id, { videoId: video.id, destination: "player_channel" })).rejects.toMatchObject({
      code: "not_authorized",
    });
    await authorizePlayerYouTube(db, admin.user.id, profileIds[0]);
    let calls = 0;
    const flaky = {
      async publish() {
        calls += 1;
        if (calls === 1) throw new Error("timeout");
        return { externalId: "yt_player" };
      },
    };
    const failed = await publishToYouTube(db, player.user.id, { videoId: video.id, destination: "player_channel" }, flaky);
    expect(failed.status).toBe("failed");
    expect(failed.error).toBe("timeout");
    const published = await retryYouTube(db, player.user.id, failed.id, flaky);
    expect(published.status).toBe("published");
    expect(published.externalId).toBe("yt_player");
    const duplicate = await publishToYouTube(db, player.user.id, { videoId: video.id, destination: "player_channel" }, flaky);
    expect(duplicate.id).toBe(published.id);
    await expect(readStoredVideo("/uploads/../.env")).rejects.toThrow("Video file is not on this server");
    const official = await publishToYouTube(db, admin.user.id, { videoId: video.id, destination: "notea_official" }, new GoogleYouTubePublisher({
      accessToken: "token-1",
      loadMedia: async () => ({ bytes: Uint8Array.from([1, 2, 3, 4]), contentType: "video/mp4" }),
      fetchImpl: async (url, init) => {
        const headers = new Headers(init?.headers);
        expect(headers.get("authorization")).toBe("Bearer token-1");
        if (String(url).includes("uploadType=resumable")) {
          expect(init?.method).toBe("POST");
          expect(headers.get("x-upload-content-length")).toBe("4");
          return new Response(null, { status: 200, headers: { location: "https://upload.youtube.test/session" } });
        }
        expect(String(url)).toBe("https://upload.youtube.test/session");
        expect(init?.method).toBe("PUT");
        return new Response(JSON.stringify({ id: "yt_official" }), { status: 200 });
      },
    }));
    expect(official.status).toBe("published");
    expect(official.externalId).toBe("yt_official");
    const mirrored = await mirrorToOfficialYouTube(db, player.user.id, video.id, flaky);
    expect(mirrored.id).toBe(official.id);
    const videoNotes = await listNotifications(db, player.user.id);
    expect(videoNotes.some((note) => note.type === "video")).toBe(true);
    await updateAccountSettings(db, player.user.id, { notificationPrefs: { social: false } });
    const fan = await verifiedPerson(db);
    await onboard(fan.user.id, ["fan"]);
    await setActiveContext(db, player.user.id, { kind: "profile", id: profileIds[0] });
    const post = await publishPost(db, player.user.id, { kind: "video", category: "highlight", body: "Watch", videoId: video.id });
    const before = (await listNotifications(db, player.user.id)).length;
    await likePost(db, fan.user.id, post.id);
    expect((await listNotifications(db, player.user.id)).length).toBe(before);
  });

  it("limits sensitive admin views and keeps business managers distinct", async () => {
    const admin = await verifiedPerson(db, { name: "Ada" });
    const support = await verifiedPerson(db, { name: "Support" });
    const officer = await verifiedPerson(db, { name: "Officer" });
    const moderator = await verifiedPerson(db, { name: "Mod" });
    const member = await verifiedPerson(db, { name: "Member", phone: "+255755000333" });
    await bootstrapSuperAdmin(db, admin.user.id);
    await grantPlatformRole(db, admin.user.id, support.user.id, "customer_support");
    await grantPlatformRole(db, admin.user.id, officer.user.id, "verification_officer");
    await grantPlatformRole(db, admin.user.id, moderator.user.id, "content_moderator");
    const desk = await verifiedPerson(db, { name: "Desk" });
    await grantPlatformRole(db, admin.user.id, desk.user.id, "platform_admin");
    const seenBySupport = await getAdminUser(db, support.user.id, member.user.id);
    expect(seenBySupport.phone).toBe("+255755000333");
    const seenByAdmin = await getAdminUser(db, desk.user.id, member.user.id);
    expect(seenByAdmin.phone).toBeNull();
    await expect(getAdminUser(db, moderator.user.id, member.user.id)).rejects.toMatchObject({ code: "forbidden" });
    const { profileIds } = await onboard(member.user.id, ["player"]);
    const applicationId = await submitVerification(db, member.user.id, {
      subjectType: "identity",
      subjectId: profileIds[0],
      documents: [{ name: "nida.pdf", url: "/docs/nida.pdf" }],
    });
    await expect(getVerificationCase(db, desk.user.id, applicationId)).rejects.toMatchObject({ code: "forbidden" });
    expect((await getVerificationCase(db, officer.user.id, applicationId)).documents[0].name).toBe("nida.pdf");
    expect(platformCan(["content_moderator"], "users.read_sensitive")).toBe(false);
    expect(platformCan(["customer_support"], "verification.read_documents")).toBe(false);
    const nextToken = await changePassword(db, member.user.id, member.password, "new-secret-9");
    expect(await userFromToken(db, member.token)).toBeNull();
    expect((await userFromToken(db, nextToken))?.id).toBe(member.user.id);
  });

  it("rejects a second personal profile of the same type", async () => {
    const person = await verifiedPerson(db);
    await onboard(person.user.id, ["fan"]);
    await expect(addProfile(db, person.user.id, "fan")).rejects.toBeInstanceOf(AppError);
  });

  it("presents a private profile only to its owner", async () => {
    const person = await verifiedPerson(db, { name: "Private" });
    const { profileIds } = await onboard(person.user.id, ["coach"]);
    await updateProfile(db, person.user.id, profileIds[0], { visibility: "private", bio: "Session plans" });
    expect(await publicProfile(db, profileIds[0], "other")).toBeNull();
    expect((await publicProfile(db, profileIds[0], person.user.id))?.bio).toBe("Session plans");
    const row = await publicProfile(db, profileIds[0], person.user.id);
    expect(presentProfile({ ...row!, visibility: "public", privacy: { showContact: false, showPreciseLocation: false, allowRecruitmentContact: true } }, { isMinor: false }, "other")?.contactPhone).toBeNull();
  });
});
