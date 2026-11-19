import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import type { NotificationPrefs, PrivacySettings, Rendition, SocialLinks } from "@/domain/types";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  language: text("language").notNull().default("sw"),
  status: text("status").notNull().default("pending_verification"),
  phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true, mode: "date" }),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true, mode: "date" }),
  dateOfBirth: date("date_of_birth"),
  isMinor: boolean("is_minor").notNull().default(false),
  guardianName: text("guardian_name"),
  guardianConsentAt: timestamp("guardian_consent_at", { withTimezone: true, mode: "date" }),
  notificationPrefs: jsonb("notification_prefs").$type<NotificationPrefs>().notNull(),
  privacy: jsonb("privacy").$type<PrivacySettings>().notNull(),
  interests: text("interests").array().notNull(),
  regions: text("regions").array().notNull(),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true, mode: "date" }).notNull(),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true, mode: "date" }),
  deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamps.createdAt,
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamps.createdAt,
});

export const verificationCodes = pgTable("verification_codes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  channel: text("channel").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamps.createdAt,
});

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio").notNull().default(""),
  region: text("region"),
  country: text("country").notNull().default("Tanzania"),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  visibility: text("visibility").notNull().default("public"),
  verifiedStatus: text("verified_status").notNull().default("not_submitted"),
  position: text("position"),
  preferredFoot: text("preferred_foot"),
  footballHistory: text("football_history"),
  achievements: text("achievements"),
  level: text("level"),
  section: text("section"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  preciseLocation: text("precise_location"),
  privacy: jsonb("privacy").$type<PrivacySettings>().notNull(),
  youtubeAuthorized: boolean("youtube_authorized").notNull().default(false),
  createdAt: timestamps.createdAt,
});

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  country: text("country").notNull().default("Tanzania"),
  region: text("region").notNull(),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  verifiedStatus: text("verified_status").notNull().default("not_submitted"),
  level: text("level"),
  section: text("section"),
  representativeName: text("representative_name").notNull(),
  representativePhone: text("representative_phone"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamps.createdAt,
});

export const organizationMembers = pgTable("organization_members", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamps.createdAt,
});

export const businesses = pgTable("businesses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  location: text("location").notNull(),
  region: text("region"),
  country: text("country").notNull().default("Tanzania"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  website: text("website"),
  whatsapp: text("whatsapp"),
  socialLinks: jsonb("social_links").$type<SocialLinks>().notNull(),
  verifiedStatus: text("verified_status").notNull().default("not_submitted"),
  showPublicContact: boolean("show_public_contact").notNull().default(false),
  preciseLocation: text("precise_location"),
  profileId: text("profile_id"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamps.createdAt,
});

export const businessMembers = pgTable("business_members", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamps.createdAt,
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  priceLabel: text("price_label"),
});

export const platformRoles = pgTable("platform_roles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull().default("active"),
  grantedBy: text("granted_by"),
  createdAt: timestamps.createdAt,
});

export const activeContexts = pgTable("active_contexts", {
  userId: text("user_id").primaryKey(),
  kind: text("kind").notNull(),
  profileId: text("profile_id"),
  organizationId: text("organization_id"),
  businessId: text("business_id"),
});

export const verificationApplications = pgTable("verification_applications", {
  id: text("id").primaryKey(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  applicantUserId: text("applicant_user_id").notNull(),
  status: text("status").notNull().default("pending_review"),
  documents: jsonb("documents").$type<{ name: string; url: string }[]>().notNull(),
  notes: text("notes"),
  reviewerId: text("reviewer_id"),
  decisionNote: text("decision_note"),
  createdAt: timestamps.createdAt,
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: text("id").primaryKey(),
  authorUserId: text("author_user_id").notNull(),
  publisherProfileId: text("publisher_profile_id"),
  publisherOrganizationId: text("publisher_organization_id"),
  publisherBusinessId: text("publisher_business_id"),
  publisherLabel: text("publisher_label").notNull(),
  kind: text("kind").notNull(),
  category: text("category").notNull().default("general"),
  body: text("body").notNull().default(""),
  mediaUrl: text("media_url"),
  thumbnailUrl: text("thumbnail_url"),
  region: text("region"),
  videoId: text("video_id"),
  status: text("status").notNull().default("published"),
  sponsoredCampaignId: text("sponsored_campaign_id"),
  level: text("level"),
  section: text("section"),
  createdAt: timestamps.createdAt,
});

export const postLikes = pgTable(
  "post_likes",
  {
    postId: text("post_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })],
);

export const postSaves = pgTable(
  "post_saves",
  {
    postId: text("post_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })],
);

export const comments = pgTable("comments", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull(),
  userId: text("user_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamps.createdAt,
});

export const postReports = pgTable("post_reports", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull(),
  userId: text("user_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamps.createdAt,
});

export const shares = pgTable(
  "shares",
  {
    postId: text("post_id").notNull(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })],
);

export const follows = pgTable("follows", {
  id: text("id").primaryKey(),
  followerUserId: text("follower_user_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  createdAt: timestamps.createdAt,
});

export const highlights = pgTable("highlights", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  title: text("title").notNull(),
  videoUrl: text("video_url"),
  selfReported: boolean("self_reported").notNull().default(true),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamps.createdAt,
});

export const shortlists = pgTable("shortlists", {
  id: text("id").primaryKey(),
  scoutProfileId: text("scout_profile_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamps.createdAt,
});

export const shortlistItems = pgTable(
  "shortlist_items",
  {
    shortlistId: text("shortlist_id").notNull(),
    playerProfileId: text("player_profile_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.shortlistId, table.playerProfileId] })],
);

export const opportunities = pgTable("opportunities", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  title: text("title").notNull(),
  kind: text("kind").notNull(),
  description: text("description").notNull().default(""),
  region: text("region"),
  status: text("status").notNull().default("open"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamps.createdAt,
});

export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id").notNull(),
  playerProfileId: text("player_profile_id").notNull(),
  status: text("status").notNull().default("submitted"),
  createdAt: timestamps.createdAt,
});

export const teams = pgTable("teams", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  ageGroup: text("age_group"),
  createdAt: timestamps.createdAt,
});

export const affiliations = pgTable("affiliations", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  teamId: text("team_id"),
  profileId: text("profile_id").notNull(),
  role: text("role").notNull(),
  verifiedStatus: text("verified_status").notNull().default("not_submitted"),
  createdAt: timestamps.createdAt,
});

export const announcements = pgTable("announcements", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamps.createdAt,
});

export const enquiries = pgTable("enquiries", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  fromUserId: text("from_user_id").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamps.createdAt,
});

export const videos = pgTable("videos", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  profileId: text("profile_id"),
  title: text("title").notNull(),
  sourceUrl: text("source_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  contentHash: text("content_hash").notNull(),
  status: text("status").notNull().default("processing"),
  renditions: jsonb("renditions").$type<Rendition[]>().notNull(),
  createdAt: timestamps.createdAt,
});

export const youtubePublications = pgTable("youtube_publications", {
  id: text("id").primaryKey(),
  videoId: text("video_id").notNull(),
  destination: text("destination").notNull(),
  status: text("status").notNull().default("queued"),
  externalId: text("external_id"),
  error: text("error"),
  attempts: integer("attempts").notNull().default(0),
  contentHash: text("content_hash").notNull(),
  createdAt: timestamps.createdAt,
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: text("id").primaryKey(),
  ownerType: text("owner_type").notNull(),
  businessId: text("business_id"),
  sponsorKey: text("sponsor_key"),
  name: text("name").notNull(),
  body: text("body").notNull(),
  kind: text("kind").notNull(),
  placement: text("placement").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }),
  endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }),
  status: text("status").notNull().default("draft"),
  paymentStatus: text("payment_status").notNull().default("not_required"),
  paymentRef: text("payment_ref"),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  createdBy: text("created_by").notNull(),
  createdAt: timestamps.createdAt,
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamps.createdAt,
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamps.createdAt,
});
