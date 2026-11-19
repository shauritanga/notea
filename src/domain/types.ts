export const personalProfileTypes = ["fan", "player", "coach", "scout"] as const;
export const profileTypes = [...personalProfileTypes, "business"] as const;
export const orgCategories = ["club", "academy", "team", "association"] as const;
export const orgRoles = ["owner", "administrator", "manager", "coach", "content_manager"] as const;
export const businessRoles = ["owner", "administrator", "marketing_manager", "content_manager"] as const;
export const platformRoleNames = [
  "super_admin",
  "platform_admin",
  "content_moderator",
  "verification_officer",
  "advertising_manager",
  "sponsor_manager",
  "customer_support",
] as const;
export const levels = ["school", "grassroots", "amateur", "semi_professional", "professional"] as const;
export const sections = ["open", "women"] as const;
export const verificationStatuses = [
  "not_submitted",
  "pending_review",
  "approved",
  "rejected",
  "more_information_required",
  "suspended",
] as const;
export const accountStatuses = [
  "pending_verification",
  "active",
  "restricted",
  "suspended",
  "deactivated",
] as const;
export const feedModes = ["personalized", "following", "trending", "nearby"] as const;
export const contentCategories = [
  "general",
  "match",
  "training",
  "highlight",
  "women",
  "grassroots",
  "academy",
  "business",
  "education",
  "announcement",
] as const;

export type PersonalProfileType = (typeof personalProfileTypes)[number];
export type ProfileType = (typeof profileTypes)[number];
export type OrgCategory = (typeof orgCategories)[number];
export type OrgRole = (typeof orgRoles)[number];
export type BusinessRole = (typeof businessRoles)[number];
export type PlatformRoleName = (typeof platformRoleNames)[number];
export type Level = (typeof levels)[number];
export type Section = (typeof sections)[number];
export type VerificationStatus = (typeof verificationStatuses)[number];
export type AccountStatus = (typeof accountStatuses)[number];
export type FeedMode = (typeof feedModes)[number];
export type Language = "sw" | "en";

export type NotificationPrefs = {
  account: boolean;
  social: boolean;
  video: boolean;
  recruitment: boolean;
  business: boolean;
  organization: boolean;
};

export type PrivacySettings = {
  showContact: boolean;
  showPreciseLocation: boolean;
  allowRecruitmentContact: boolean;
};

export type SocialLinks = {
  instagram?: string;
  facebook?: string;
  x?: string;
};

export type Rendition = {
  quality: "360p" | "720p";
  bitrate: number;
  url: string;
};

export type VerificationSubject =
  | "identity"
  | "player"
  | "organization"
  | "business"
  | "affiliation";

export const defaultNotificationPrefs = (): NotificationPrefs => ({
  account: true,
  social: true,
  video: true,
  recruitment: true,
  business: true,
  organization: true,
});

export const defaultPrivacy = (): PrivacySettings => ({
  showContact: false,
  showPreciseLocation: false,
  allowRecruitmentContact: true,
});

export const videoPlayback = {
  autoplay: true,
  muted: true,
  playsInline: true,
} as const;
