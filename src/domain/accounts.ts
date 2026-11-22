import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { activeContexts, profiles, sessions, users, verificationCodes } from "@/db/schema";
import { assertAccount, audit, mustUser } from "@/domain/access";
import { hashCode, hashPassword, hashToken, newCode, newId, newToken, normalizeEmail, normalizePhone, verifyPassword } from "@/domain/crypto";
import type { Database } from "@/domain/db";
import { AppError } from "@/domain/errors";
import {
  defaultNotificationPrefs,
  defaultPrivacy,
  personalProfileTypes,
  type Language,
  type PersonalProfileType,
  type PrivacySettings,
} from "@/domain/types";

const SESSION_MS = 1000 * 60 * 60 * 24 * 30;
const CODE_MS = 1000 * 60 * 10;

export function isMinorDob(isoDate: string, today = new Date()) {
  const dob = new Date(`${isoDate}T00:00:00.000Z`);
  const cutoff = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
  return dob.getTime() > cutoff.getTime();
}

function assertPassword(password: string) {
  if (password.length < 8) throw new AppError("weak_password", "Use at least 8 characters");
}

function assertName(name: string) {
  const clean = name.trim();
  if (clean.length < 2) throw new AppError("name_required", "Add your name");
  return clean;
}

async function issueCode(db: Database, userId: string, channel: "email" | "phone") {
  const code = newCode();
  await db.insert(verificationCodes).values({
    id: newId(),
    userId,
    channel,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + CODE_MS),
    createdAt: new Date(),
  });
  return code;
}

async function createSession(db: Database, userId: string) {
  const token = newToken();
  await db.insert(sessions).values({
    id: newId(),
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_MS),
    createdAt: new Date(),
  });
  return token;
}

export async function registerIndividual(
  db: Database,
  input: {
    name: string;
    password: string;
    email?: string;
    phone?: string;
    language?: Language;
    termsAccepted: boolean;
  },
) {
  if (!input.termsAccepted) throw new AppError("consent_required", "Accept the terms to create an account");
  const email = input.email ? normalizeEmail(input.email) : null;
  const phone = input.phone ? normalizePhone(input.phone) : null;
  if (!email && !phone) throw new AppError("identifier_required", "Add a phone number or an email address");
  assertPassword(input.password);
  const name = assertName(input.name);
  if (email) {
    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) throw new AppError("already_registered", "That email is already registered");
  }
  if (phone) {
    const [existing] = await db.select().from(users).where(eq(users.phone, phone));
    if (existing) throw new AppError("already_registered", "That phone number is already registered");
  }
  const now = new Date();
  const userId = newId();
  const passwordHash = await hashPassword(input.password);
  await db.insert(users).values({
    id: userId,
    name,
    email,
    phone,
    passwordHash,
    language: input.language ?? "sw",
    status: "pending_verification",
    isMinor: false,
    notificationPrefs: defaultNotificationPrefs(),
    privacy: defaultPrivacy(),
    interests: [],
    regions: [],
    termsAcceptedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  const codes: { email?: string; phone?: string } = {};
  if (email) codes.email = await issueCode(db, userId, "email");
  if (phone) codes.phone = await issueCode(db, userId, "phone");
  const token = await createSession(db, userId);
  const user = await mustUser(db, userId);
  if (user.passwordHash === input.password || !user.passwordHash.startsWith("scrypt$")) {
    throw new AppError("password_storage", "Password was not hashed");
  }
  const [session] = await db.select().from(sessions).where(eq(sessions.userId, userId));
  if (session.tokenHash === token) throw new AppError("session_storage", "Session token was stored in plain text");
  return { user, codes, token };
}

export async function latestVerification(db: Database, userId: string) {
  const [row] = await db
    .select()
    .from(verificationCodes)
    .where(and(eq(verificationCodes.userId, userId), isNull(verificationCodes.consumedAt)))
    .orderBy(desc(verificationCodes.createdAt))
    .limit(1);
  if (!row) return null;
  return { createdAt: row.createdAt, expiresAt: row.expiresAt };
}

export async function issueVerificationCodes(db: Database, userId: string) {
  const user = await mustUser(db, userId);
  if (user.status !== "pending_verification") throw new AppError("already_verified", "This account is already verified");
  const codes: Array<{ channel: "email" | "phone"; destination: string; code: string }> = [];
  if (user.phone) codes.push({ channel: "phone", destination: user.phone, code: await issueCode(db, user.id, "phone") });
  if (user.email) codes.push({ channel: "email", destination: user.email, code: await issueCode(db, user.id, "email") });
  if (codes.length === 0) throw new AppError("identifier_required", "Add a phone number or an email address");
  return { language: user.language, codes };
}

function normalizeVerificationCode(code: string) {
  return code.match(/\d{6}/)?.[0] ?? "";
}

export async function verifySubmittedCode(db: Database, code: string) {
  const normalized = normalizeVerificationCode(code);
  if (!normalized) throw new AppError("invalid_code", "That code is not valid");
  const now = new Date();
  const rows = await db
    .select()
    .from(verificationCodes)
    .where(and(isNull(verificationCodes.consumedAt), gt(verificationCodes.expiresAt, now)));
  const match = rows.find((row) => row.codeHash === hashCode(normalized));
  if (!match) throw new AppError("invalid_code", "That code is not valid");
  const user = await verifyContact(db, match.userId, normalized);
  const token = await createSession(db, user.id);
  return { user, token };
}

export async function verifyContact(db: Database, userId: string, code: string) {
  const normalized = normalizeVerificationCode(code);
  const now = new Date();
  const rows = await db
    .select()
    .from(verificationCodes)
    .where(and(eq(verificationCodes.userId, userId), isNull(verificationCodes.consumedAt), gt(verificationCodes.expiresAt, now)));
  const match = normalized ? rows.find((row) => row.codeHash === hashCode(normalized)) : undefined;
  if (!match) throw new AppError("invalid_code", "That code is not valid");
  await db.update(verificationCodes).set({ consumedAt: now }).where(eq(verificationCodes.id, match.id));
  const user = await mustUser(db, userId);
  const patch: Partial<typeof users.$inferInsert> = { updatedAt: now };
  if (match.channel === "email") patch.emailVerifiedAt = now;
  if (match.channel === "phone") patch.phoneVerifiedAt = now;
  if (user.status === "pending_verification") patch.status = "active";
  await db.update(users).set(patch).where(eq(users.id, userId));
  await audit(db, userId, "account.verified", "user", userId, { channel: match.channel });
  return mustUser(db, userId);
}

export async function login(db: Database, input: { identifier: string; password: string }) {
  const identifier = input.identifier.trim();
  const email = identifier.includes("@") ? normalizeEmail(identifier) : null;
  const phone = email ? null : normalizePhone(identifier);
  const [user] = email
    ? await db.select().from(users).where(eq(users.email, email))
    : await db.select().from(users).where(eq(users.phone, phone!));
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError("invalid_login", "Those details do not match an account");
  }
  if (user.status === "suspended") throw new AppError("account_blocked", "This account is suspended");
  if (user.status === "deactivated") throw new AppError("account_deactivated", "Recover this account to sign in again");
  const token = await createSession(db, user.id);
  return { user, token };
}

export async function userFromToken(db: Database, token: string) {
  const now = new Date();
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, now)));
  if (!session) return null;
  const user = await mustUser(db, session.userId);
  if (user.status === "suspended" || user.status === "deactivated") return null;
  return user;
}

export async function changePassword(db: Database, userId: string, current: string, next: string) {
  const user = await mustUser(db, userId);
  if (!(await verifyPassword(current, user.passwordHash))) throw new AppError("invalid_login", "Current password is wrong");
  assertPassword(next);
  await db.update(users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await audit(db, userId, "account.password_changed", "user", userId);
  return createSession(db, userId);
}

export async function requestRecoveryCode(db: Database, identifier: string) {
  const email = identifier.includes("@") ? normalizeEmail(identifier) : null;
  const phone = email ? null : normalizePhone(identifier);
  const [user] = email
    ? await db.select().from(users).where(eq(users.email, email))
    : await db.select().from(users).where(eq(users.phone, phone!));
  if (!user) throw new AppError("not_found", "Account not found");
  if (user.status !== "deactivated") throw new AppError("not_deactivated", "This account is still open");
  const channel: "email" | "phone" = email ? "email" : "phone";
  const code = await issueCode(db, user.id, channel);
  return { userId: user.id, code, channel };
}

export async function recoverAccount(db: Database, userId: string, code: string) {
  const user = await mustUser(db, userId);
  if (user.status !== "deactivated") throw new AppError("not_deactivated", "This account is still open");
  await verifyContact(db, userId, code);
  await db
    .update(users)
    .set({ status: "active", deletionRequestedAt: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
  await audit(db, userId, "account.recovered", "user", userId);
  return mustUser(db, userId);
}

export async function deactivateAccount(db: Database, userId: string) {
  await assertAccount(db, userId, "read");
  await db.update(users).set({ status: "deactivated", updatedAt: new Date() }).where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await audit(db, userId, "account.deactivated", "user", userId);
}

export async function requestDeletion(db: Database, userId: string) {
  await deactivateAccount(db, userId);
  const now = new Date();
  await db.update(users).set({ deletionRequestedAt: now, updatedAt: now }).where(eq(users.id, userId));
  await audit(db, userId, "account.deletion_requested", "user", userId);
}

export async function recordGuardianConsent(db: Database, userId: string, guardianName: string) {
  const user = await mustUser(db, userId);
  if (!user.isMinor) throw new AppError("not_minor", "Guardian consent is for members under 18");
  const name = assertName(guardianName);
  const now = new Date();
  await db.update(users).set({ guardianName: name, guardianConsentAt: now, updatedAt: now }).where(eq(users.id, userId));
  await audit(db, userId, "account.guardian_consent", "user", userId);
  return mustUser(db, userId);
}

export async function updateAccountSettings(
  db: Database,
  userId: string,
  input: {
    language?: Language;
    notificationPrefs?: Partial<ReturnType<typeof defaultNotificationPrefs>>;
    privacy?: Partial<PrivacySettings>;
    interests?: string[];
    regions?: string[];
  },
) {
  const user = await assertAccount(db, userId, "read");
  const privacy = { ...user.privacy, ...input.privacy };
  if (user.isMinor && (privacy.showContact || privacy.showPreciseLocation)) {
    throw new AppError("minor_privacy", "A young player's contact details and precise location stay private");
  }
  await db
    .update(users)
    .set({
      language: input.language ?? user.language,
      notificationPrefs: { ...user.notificationPrefs, ...input.notificationPrefs },
      privacy,
      interests: input.interests ?? user.interests,
      regions: input.regions ?? user.regions,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  return mustUser(db, userId);
}

async function insertProfile(
  db: Database,
  userId: string,
  type: PersonalProfileType,
  input: {
    displayName?: string;
    bio?: string;
    region?: string;
    position?: string;
    preferredFoot?: string;
    footballHistory?: string;
    achievements?: string;
    level?: string;
    section?: string;
    visibility?: string;
  },
) {
  const user = await mustUser(db, userId);
  if (!personalProfileTypes.includes(type)) throw new AppError("invalid_profile", "Choose a supported profile");
  const minor = user.isMinor;
  let visibility = input.visibility ?? (minor ? "private" : "public");
  if (minor && type === "player" && visibility === "public" && !user.guardianConsentAt) {
    throw new AppError("guardian_required", "A parent or guardian must consent before this profile is public");
  }
  if (minor) visibility = visibility === "public" && user.guardianConsentAt ? "public" : "private";
  const id = newId();
  try {
  await db.insert(profiles).values({
    id,
    userId,
    type,
    displayName: (input.displayName ?? user.name).trim(),
    bio: input.bio ?? "",
    region: input.region ?? user.regions[0] ?? null,
    visibility,
    position: input.position ?? null,
    preferredFoot: input.preferredFoot ?? null,
    footballHistory: input.footballHistory ?? null,
    achievements: input.achievements ?? null,
    level: input.level ?? null,
    section: input.section ?? null,
    privacy: defaultPrivacy(),
    createdAt: new Date(),
  });
  } catch (error) {
    const cause = error instanceof Error && "cause" in error ? (error.cause as { code?: string } | undefined) : undefined;
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : cause?.code;
    if (code === "23505") throw new AppError("profile_exists", "You already have this profile");
    throw error;
  }
  return id;
}

export async function completeOnboarding(
  db: Database,
  userId: string,
  input: {
    language: Language;
    interests: string[];
    regions: string[];
    profileTypes: PersonalProfileType[];
    dateOfBirth?: string;
    guardianName?: string;
    guardianConsent?: boolean;
    player?: {
      position?: string;
      preferredFoot?: string;
      footballHistory?: string;
      achievements?: string;
      level?: string;
      section?: string;
    };
  },
) {
  await assertAccount(db, userId, "write");
  if (input.language !== "sw" && input.language !== "en") throw new AppError("language", "Choose Kiswahili or English");
  const now = new Date();
  let isMinor = false;
  if (input.dateOfBirth) {
    isMinor = isMinorDob(input.dateOfBirth, now);
  }
  await db
    .update(users)
    .set({
      language: input.language,
      interests: input.interests,
      regions: input.regions,
      dateOfBirth: input.dateOfBirth ?? null,
      isMinor,
      guardianName: isMinor && input.guardianConsent ? input.guardianName ?? null : null,
      guardianConsentAt: isMinor && input.guardianConsent ? now : null,
      onboardedAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, userId));
  const created: string[] = [];
  for (const type of input.profileTypes) {
    const id = await insertProfile(db, userId, type, {
      ...(type === "player" ? input.player : {}),
      region: input.regions[0],
    });
    created.push(id);
  }
  if (created[0]) await setActiveContext(db, userId, { kind: "profile", id: created[0] });
  return { user: await mustUser(db, userId), profileIds: created };
}

export async function addProfile(db: Database, userId: string, type: PersonalProfileType, extra: Parameters<typeof insertProfile>[3] = {}) {
  await assertAccount(db, userId, "write");
  return insertProfile(db, userId, type, extra);
}

export async function updateProfile(
  db: Database,
  userId: string,
  profileId: string,
  patch: {
    displayName?: string;
    bio?: string;
    region?: string;
    visibility?: string;
    position?: string;
    preferredFoot?: string;
    footballHistory?: string;
    achievements?: string;
    level?: string;
    section?: string;
    contactPhone?: string;
    contactEmail?: string;
    preciseLocation?: string;
    privacy?: Partial<PrivacySettings>;
    avatarUrl?: string;
    coverUrl?: string;
  },
) {
  const user = await assertAccount(db, userId, "write");
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId));
  if (!profile || profile.userId !== userId) throw new AppError("forbidden", "That profile is not yours");
  const privacy = { ...profile.privacy, ...patch.privacy };
  if (user.isMinor && (privacy.showContact || privacy.showPreciseLocation)) {
    throw new AppError("minor_privacy", "A young player's contact details and precise location stay private");
  }
  if (user.isMinor && profile.type === "player" && patch.visibility === "public" && !user.guardianConsentAt) {
    throw new AppError("guardian_required", "A parent or guardian must consent before this profile is public");
  }
  await db
    .update(profiles)
    .set({
      displayName: patch.displayName?.trim() || profile.displayName,
      bio: patch.bio ?? profile.bio,
      region: patch.region ?? profile.region,
      visibility: patch.visibility ?? profile.visibility,
      position: patch.position ?? profile.position,
      preferredFoot: patch.preferredFoot ?? profile.preferredFoot,
      footballHistory: patch.footballHistory ?? profile.footballHistory,
      achievements: patch.achievements ?? profile.achievements,
      level: patch.level ?? profile.level,
      section: patch.section ?? profile.section,
      contactPhone: patch.contactPhone ?? profile.contactPhone,
      contactEmail: patch.contactEmail ?? profile.contactEmail,
      preciseLocation: patch.preciseLocation ?? profile.preciseLocation,
      avatarUrl: patch.avatarUrl ?? profile.avatarUrl,
      coverUrl: patch.coverUrl ?? profile.coverUrl,
      privacy,
    })
    .where(eq(profiles.id, profileId));
  const [updated] = await db.select().from(profiles).where(eq(profiles.id, profileId));
  return updated;
}

export async function setActiveContext(
  db: Database,
  userId: string,
  input: { kind: "profile" | "organization" | "business"; id: string },
) {
  await assertAccount(db, userId, "read");
  if (input.kind === "profile") {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, input.id));
    if (!profile || profile.userId !== userId) throw new AppError("forbidden", "That profile is not yours");
  }
  if (input.kind === "organization") {
    const { activeOrgMember } = await import("@/domain/access");
    const member = await activeOrgMember(db, input.id, userId);
    if (!member) throw new AppError("forbidden", "You do not manage that organization");
  }
  if (input.kind === "business") {
    const { activeBusinessMember } = await import("@/domain/access");
    const member = await activeBusinessMember(db, input.id, userId);
    if (!member) throw new AppError("forbidden", "You do not manage that business");
  }
  await db
    .insert(activeContexts)
    .values({
      userId,
      kind: input.kind,
      profileId: input.kind === "profile" ? input.id : null,
      organizationId: input.kind === "organization" ? input.id : null,
      businessId: input.kind === "business" ? input.id : null,
    })
    .onConflictDoUpdate({
      target: activeContexts.userId,
      set: {
        kind: input.kind,
        profileId: input.kind === "profile" ? input.id : null,
        organizationId: input.kind === "organization" ? input.id : null,
        businessId: input.kind === "business" ? input.id : null,
      },
    });
}

export async function getActiveContext(db: Database, userId: string) {
  const [context] = await db.select().from(activeContexts).where(eq(activeContexts.userId, userId));
  return context ?? null;
}

export async function listMyProfiles(db: Database, userId: string) {
  return db.select().from(profiles).where(eq(profiles.userId, userId));
}

export function presentProfile(
  profile: typeof profiles.$inferSelect,
  owner: { isMinor: boolean },
  viewerId?: string,
) {
  if (profile.visibility !== "public" && viewerId !== profile.userId) return null;
  const privacy = { ...defaultPrivacy(), ...profile.privacy };
  const showContact = !owner.isMinor && privacy.showContact;
  const showLocation = !owner.isMinor && privacy.showPreciseLocation;
  return {
    ...profile,
    contactPhone: showContact ? profile.contactPhone : null,
    contactEmail: showContact ? profile.contactEmail : null,
    preciseLocation: showLocation ? profile.preciseLocation : null,
    verified: profile.verifiedStatus === "approved",
    selfReported: profile.verifiedStatus !== "approved",
  };
}

export async function publicProfile(db: Database, profileId: string, viewerId?: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId));
  if (!profile) return null;
  const owner = await mustUser(db, profile.userId);
  return presentProfile(profile, owner, viewerId);
}
