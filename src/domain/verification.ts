import { eq } from "drizzle-orm";
import { affiliations, businesses, organizations, profiles, users, verificationApplications } from "@/db/schema";
import { assertAccount, assertBusiness, assertOrg, assertPlatform, audit } from "@/domain/access";
import { newId } from "@/domain/crypto";
import type { Database } from "@/domain/db";
import { AppError } from "@/domain/errors";
import { notify } from "@/domain/notify";
import type { VerificationStatus, VerificationSubject } from "@/domain/types";

const decisions: VerificationStatus[] = ["approved", "rejected", "more_information_required", "suspended"];

async function setSubjectStatus(db: Database, subjectType: string, subjectId: string, status: string) {
  if (subjectType === "organization") {
    await db.update(organizations).set({ verifiedStatus: status }).where(eq(organizations.id, subjectId));
  } else if (subjectType === "business") {
    await db.update(businesses).set({ verifiedStatus: status }).where(eq(businesses.id, subjectId));
  } else if (subjectType === "player" || subjectType === "identity") {
    await db.update(profiles).set({ verifiedStatus: status }).where(eq(profiles.id, subjectId));
    if (subjectType === "identity") {
      const [profile] = await db.select().from(profiles).where(eq(profiles.id, subjectId));
      if (profile) await db.update(users).set({ updatedAt: new Date() }).where(eq(users.id, profile.userId));
    }
  } else if (subjectType === "affiliation") {
    await db.update(affiliations).set({ verifiedStatus: status }).where(eq(affiliations.id, subjectId));
  }
}

export async function submitVerification(
  db: Database,
  actorId: string,
  input: {
    subjectType: VerificationSubject;
    subjectId: string;
    documents: { name: string; url: string }[];
    notes?: string;
  },
) {
  await assertAccount(db, actorId, "write");
  if (input.documents.length === 0) throw new AppError("documents_required", "Add at least one document");
  if (input.subjectType === "organization") await assertOrg(db, actorId, input.subjectId, "org.verify");
  if (input.subjectType === "business") await assertBusiness(db, actorId, input.subjectId, "biz.verify");
  if (input.subjectType === "player" || input.subjectType === "identity") {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, input.subjectId));
    if (!profile || profile.userId !== actorId) throw new AppError("forbidden", "You can only verify your own profile");
  }
  const id = newId();
  await db.insert(verificationApplications).values({
    id,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    applicantUserId: actorId,
    status: "pending_review",
    documents: input.documents,
    notes: input.notes ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await setSubjectStatus(db, input.subjectType, input.subjectId, "pending_review");
  return id;
}

export async function reviewVerification(
  db: Database,
  actorId: string,
  input: { applicationId: string; decision: VerificationStatus; note?: string },
) {
  await assertPlatform(db, actorId, "verification.review");
  if (!decisions.includes(input.decision)) throw new AppError("invalid_decision", "Choose a verification decision");
  const [application] = await db.select().from(verificationApplications).where(eq(verificationApplications.id, input.applicationId));
  if (!application) throw new AppError("not_found", "Application not found");
  const now = new Date();
  await db
    .update(verificationApplications)
    .set({ status: input.decision, reviewerId: actorId, decisionNote: input.note ?? null, updatedAt: now })
    .where(eq(verificationApplications.id, application.id));
  await setSubjectStatus(db, application.subjectType, application.subjectId, input.decision);
  await audit(db, actorId, "verification.decision", application.subjectType, application.subjectId, {
    applicationId: application.id,
    decision: input.decision,
  });
  await notify(db, {
    userId: application.applicantUserId,
    type: "account",
    title: "Verification update",
    body: `A reviewer marked your ${application.subjectType} verification as ${input.decision.replaceAll("_", " ")}.`,
  });
}

export async function listVerificationQueue(db: Database, actorId: string) {
  await assertPlatform(db, actorId, "verification.review");
  const rows = await db.select().from(verificationApplications);
  return rows.map((row) => ({
    id: row.id,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    applicantUserId: row.applicantUserId,
    status: row.status,
    notes: row.notes,
    decisionNote: row.decisionNote,
    createdAt: row.createdAt,
  }));
}

export async function getVerificationCase(db: Database, actorId: string, applicationId: string) {
  await assertPlatform(db, actorId, "verification.read_documents");
  const [row] = await db.select().from(verificationApplications).where(eq(verificationApplications.id, applicationId));
  if (!row) throw new AppError("not_found", "Application not found");
  return row;
}
