import type { BusinessRole, OrgRole, PlatformRoleName } from "@/domain/types";

export const platformPermissions = {
  "users.read": ["super_admin", "platform_admin", "customer_support", "verification_officer"],
  "users.manage_status": ["super_admin", "platform_admin"],
  "users.recover": ["super_admin", "platform_admin", "customer_support"],
  "users.read_sensitive": ["super_admin", "customer_support"],
  "users.erase": ["super_admin"],
  "verification.review": ["super_admin", "verification_officer"],
  "verification.read_documents": ["super_admin", "verification_officer"],
  "content.moderate": ["super_admin", "content_moderator"],
  "sponsor.manage": ["super_admin", "sponsor_manager"],
  "ads.manage": ["super_admin", "advertising_manager"],
  "ads.report": ["super_admin", "advertising_manager", "sponsor_manager"],
  "youtube.manage": ["super_admin", "platform_admin"],
  "youtube.authorize_player": ["super_admin", "platform_admin"],
  "roles.grant_platform": ["super_admin"],
  "audit.read": ["super_admin", "platform_admin"],
  "analytics.read": ["super_admin", "platform_admin", "advertising_manager", "sponsor_manager"],
} as const;

export type PlatformPermission = keyof typeof platformPermissions;

export const orgPermissions = {
  owner: ["org.manage", "org.members", "org.content", "org.teams", "org.recruit", "org.announce", "org.verify", "org.read_private", "org.transfer"],
  administrator: ["org.manage", "org.members", "org.content", "org.teams", "org.recruit", "org.announce", "org.verify", "org.read_private"],
  manager: ["org.content", "org.teams", "org.recruit", "org.announce"],
  coach: ["org.teams"],
  content_manager: ["org.content", "org.announce"],
} as const;

export type OrgPermission = (typeof orgPermissions)["owner"][number];

export const businessPermissions = {
  owner: ["biz.manage", "biz.members", "biz.products", "biz.content", "biz.enquiries", "biz.verify", "biz.private", "biz.ads"],
  administrator: ["biz.manage", "biz.members", "biz.products", "biz.content", "biz.enquiries", "biz.verify", "biz.private", "biz.ads"],
  marketing_manager: ["biz.ads", "biz.enquiries"],
  content_manager: ["biz.content"],
} as const;

export type BusinessPermission = (typeof businessPermissions)["owner"][number];

const orgAssignable: Record<OrgRole, OrgRole[]> = {
  owner: ["owner", "administrator", "manager", "coach", "content_manager"],
  administrator: ["administrator", "manager", "coach", "content_manager"],
  manager: [],
  coach: [],
  content_manager: [],
};

const businessAssignable: Record<BusinessRole, BusinessRole[]> = {
  owner: ["owner", "administrator", "marketing_manager", "content_manager"],
  administrator: ["administrator", "marketing_manager", "content_manager"],
  marketing_manager: [],
  content_manager: [],
};

export function platformCan(roles: readonly string[], permission: PlatformPermission) {
  const allowed = platformPermissions[permission] as readonly string[];
  return roles.some((role) => allowed.includes(role));
}

export function orgCan(role: OrgRole, permission: OrgPermission) {
  return (orgPermissions[role] as readonly string[]).includes(permission);
}

export function businessCan(role: BusinessRole, permission: BusinessPermission) {
  return (businessPermissions[role] as readonly string[]).includes(permission);
}

export function canAssignOrgRole(actor: OrgRole, target: OrgRole) {
  return orgAssignable[actor].includes(target);
}

export function canAssignBusinessRole(actor: BusinessRole, target: BusinessRole) {
  return businessAssignable[actor].includes(target);
}

export function isPlatformRole(value: string): value is PlatformRoleName {
  return (platformPermissions["roles.grant_platform"] as readonly string[]).includes("super_admin") &&
    ["super_admin", "platform_admin", "content_moderator", "verification_officer", "advertising_manager", "sponsor_manager", "customer_support"].includes(value);
}
