"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import {
  changePassword,
  addProfile,
  completeOnboarding,
  deactivateAccount,
  issueVerificationCodes,
  login,
  recoverAccount,
  registerIndividual,
  requestDeletion,
  requestRecoveryCode,
  setActiveContext,
  updateAccountSettings,
  updateProfile,
  verifySubmittedCode,
} from "@/domain/accounts";
import {
  anonymizeUser,
  grantPlatformRole,
  moderatePost,
  revokePlatformRole,
  setAccountStatus,
} from "@/domain/admin";
import { assignBusinessRole, registerBusiness, revokeBusinessRole, sendEnquiry } from "@/domain/businesses";
import { createBusinessCampaign, createKairukiCampaign, markCampaignPaid, recordCampaignClick, reviewBusinessCampaign } from "@/domain/campaigns";
import { authorizePlayerYouTube, publishToYouTube, retryYouTube, uploadVideo } from "@/domain/media";
import { markNotificationsRead } from "@/domain/notify";
import { assignOrganizationRole, registerOrganization, revokeOrganizationRole } from "@/domain/organizations";
import { commentOnPost, followTarget, likePost, reportPost, savePost, sharePost } from "@/domain/social";
import {
  addHighlight,
  addToShortlist,
  affiliateProfile,
  applyToOpportunity,
  createOpportunity,
  createShortlist,
  createTeam,
  publishAnnouncement,
  updateApplicationStatus,
} from "@/domain/talent";
import { AppError } from "@/domain/errors";
import type { PlatformRoleName } from "@/domain/types";
import { reviewVerification, submitVerification } from "@/domain/verification";
import { sendVerificationCode } from "@/lib/messaging";
import { publishFromForm, saveThumbnail, storedFile } from "@/lib/publish-post";
import { clearSession, fail, getViewer, rememberCode, requireViewer, setSession } from "@/lib/viewer";

async function deliverVerification(db: Awaited<ReturnType<typeof import("@/db/client").ready>>, userId: string, language: "sw" | "en") {
  const issued = await issueVerificationCodes(db, userId);
  await rememberCode(issued.codes[0]?.code ?? "");
  for (const item of issued.codes) await sendVerificationCode(item.channel, item.destination, item.code, language, issued.name);
  return issued.codes[0]?.code ?? "";
}

export async function registerAction(formData: FormData) {
  const back = "/register";
  try {
    const identifier = String(formData.get("identifier") || formData.get("email") || formData.get("phone") || "").trim();
    const email = identifier.includes("@") ? identifier : String(formData.get("email") || "");
    const phone = identifier.includes("@") ? String(formData.get("phone") || "") : identifier;
    const language = formData.get("language") === "en" || (await cookies()).get("notea_lang")?.value === "en" ? "en" : "sw";
    const result = await (await import("@/db/client")).ready().then((db) =>
      registerIndividual(db, {
        name: String(formData.get("name") || ""),
        password: String(formData.get("password") || ""),
        email: email || undefined,
        phone: phone || undefined,
        termsAccepted: formData.get("terms") === "on",
        language,
      }),
    );
    await setSession(result.token);
    await rememberCode(result.codes.email ?? result.codes.phone ?? "");
    if (result.codes.email && email) await sendVerificationCode("email", email, result.codes.email, language, result.user.name);
    if (result.codes.phone && phone) await sendVerificationCode("phone", phone, result.codes.phone, language, result.user.name);
  } catch (error) {
    fail(back, error);
  }
  redirect("/verify");
}

export async function loginAction(formData: FormData) {
  try {
    const db = await (await import("@/db/client")).ready();
    const result = await login(db, {
      identifier: String(formData.get("identifier") || ""),
      password: String(formData.get("password") || ""),
    });
    await setSession(result.token);
    if (result.user.status === "pending_verification") {
      await deliverVerification(db, result.user.id, result.user.language === "en" ? "en" : "sw");
    }
  } catch (error) {
    fail("/login", error);
  }
  redirect("/");
}

export async function resendVerificationAction() {
  try {
    const { db, user } = await (await import("@/lib/viewer")).getViewer();
    if (!user) throw new AppError("sign_in_required", "Sign in again to request a new code");
    await deliverVerification(db, user.id, user.language === "en" ? "en" : "sw");
  } catch (error) {
    fail("/verify", error);
  }
  redirect("/verify");
}

export async function verifyAction(formData: FormData) {
  let next = "/onboarding";
  try {
    const db = await (await import("@/db/client")).ready();
    const result = await verifySubmittedCode(db, String(formData.get("code") || ""));
    await setSession(result.token);
    const jar = await cookies();
    jar.delete("notea_dev_code");
    next = result.user.onboardedAt ? "/" : "/onboarding";
  } catch (error) {
    fail("/verify", error);
  }
  redirect(next);
}

export async function recoverAction(formData: FormData) {
  try {
    const identifier = String(formData.get("identifier") || "").trim();
    const language = (await cookies()).get("notea_lang")?.value === "en" ? "en" : "sw";
    const db = await (await import("@/db/client")).ready();
    const recovery = await requestRecoveryCode(db, identifier);
    await rememberCode(recovery.code);
    await sendVerificationCode(recovery.channel, identifier, recovery.code, language, recovery.name);
    const jar = await cookies();
    jar.set("notea_recover_user", recovery.userId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  } catch (error) {
    fail("/recover", error);
  }
  redirect("/recover");
}

export async function finishRecoveryAction(formData: FormData) {
  try {
    const db = await (await import("@/db/client")).ready();
    const userId = (await cookies()).get("notea_recover_user")?.value;
    if (!userId) fail("/recover", new Error("Request a code first"));
    await recoverAccount(db, userId!, String(formData.get("code") || ""));
  } catch (error) {
    fail("/recover", error);
  }
  redirect("/login");
}

export async function onboardAction(formData: FormData) {
  try {
    const viewer = await getViewer();
    if (!viewer.user) fail("/login", new Error("Sign in first"));
    const { db, user } = { db: viewer.db, user: viewer.user! };
    const types = formData.getAll("profile").map(String).filter((type) => ["fan", "player", "coach", "scout"].includes(type)) as Array<"fan" | "player" | "coach" | "scout">;
    await completeOnboarding(db, user.id, {
      language: user.language === "en" ? "en" : "sw",
      interests: [],
      regions: [],
      profileTypes: types.length > 0 ? types : ["fan"],
    });
  } catch (error) {
    fail("/onboarding", error);
  }
  redirect("/?ready=1");
}

export async function setLanguageAction(formData: FormData) {
  const lang = formData.get("lang") === "en" ? "en" : "sw";
  const jar = await cookies();
  jar.set("notea_lang", lang, { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  const referer = (await headers()).get("referer");
  const next = referer ? new URL(referer).pathname : "/";
  try {
    const { db, user } = await getViewer();
    if (user && user.status !== "pending_verification" && user.status !== "suspended" && user.status !== "deactivated") {
      await updateAccountSettings(db, user.id, { language: lang });
    }
  } catch (error) {
    fail(next, error);
  }
  redirect(next);
}

export async function logoutAction() {
  await clearSession();
  redirect("/welcome");
}

export async function publishAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    await publishFromForm(db, user.id, formData);
  } catch (error) {
    fail("/compose", error);
  }
  redirect("/");
}

async function postReaction(formData: FormData, run: (db: Awaited<ReturnType<typeof requireViewer>>["db"], userId: string, postId: string) => Promise<unknown>) {
  const back = String(formData.get("back") || "/");
  try {
    const { db, user } = await requireViewer();
    await run(db, user.id, String(formData.get("postId") || ""));
  } catch (error) {
    fail(back, error);
  }
  redirect(back);
}

export async function likeAction(formData: FormData) {
  return postReaction(formData, likePost);
}
export async function saveAction(formData: FormData) {
  return postReaction(formData, savePost);
}
export async function shareAction(formData: FormData) {
  return postReaction(formData, sharePost);
}
export async function commentAction(formData: FormData) {
  const back = String(formData.get("back") || "/");
  try {
    const { db, user } = await requireViewer();
    await commentOnPost(db, user.id, String(formData.get("postId")), String(formData.get("body") || ""));
  } catch (error) {
    fail(back, error);
  }
  redirect(back);
}
export async function reportAction(formData: FormData) {
  const back = String(formData.get("back") || "/");
  try {
    const { db, user } = await requireViewer();
    await reportPost(db, user.id, String(formData.get("postId")), String(formData.get("reason") || "other"));
  } catch (error) {
    fail(back, error);
  }
  redirect(back);
}

export async function followAction(formData: FormData) {
  const back = String(formData.get("back") || "/discover");
  try {
    const { db, user } = await requireViewer();
    await followTarget(db, user.id, String(formData.get("targetType")) as "profile" | "organization" | "business", String(formData.get("targetId")));
  } catch (error) {
    fail(back, error);
  }
  redirect(back);
}

export async function switchAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    await setActiveContext(db, user.id, {
      kind: String(formData.get("kind")) as "profile" | "organization" | "business",
      id: String(formData.get("id")),
    });
  } catch (error) {
    fail("/you", error);
  }
  redirect("/you");
}

export async function addProfileAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    const type = String(formData.get("type") || "");
    if (type !== "fan" && type !== "player" && type !== "coach" && type !== "scout") fail("/you", new Error("Choose a profile"));
    await addProfile(db, user.id, type);
  } catch (error) {
    fail("/you", error);
  }
  redirect("/you");
}

export async function profileAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    await updateProfile(db, user.id, String(formData.get("profileId")), {
      displayName: String(formData.get("displayName") || ""),
      bio: String(formData.get("bio") || ""),
      region: String(formData.get("region") || ""),
      visibility: String(formData.get("visibility") || "public"),
      position: String(formData.get("position") || ""),
      preferredFoot: String(formData.get("preferredFoot") || ""),
      footballHistory: String(formData.get("footballHistory") || ""),
      achievements: String(formData.get("achievements") || ""),
      level: String(formData.get("level") || ""),
      section: String(formData.get("section") || ""),
      contactPhone: String(formData.get("contactPhone") || ""),
      contactEmail: String(formData.get("contactEmail") || ""),
      preciseLocation: String(formData.get("preciseLocation") || ""),
      privacy: {
        showContact: formData.get("showContact") === "on",
        showPreciseLocation: formData.get("showPreciseLocation") === "on",
        allowRecruitmentContact: formData.get("allowRecruitmentContact") === "on",
      },
    });
  } catch (error) {
    fail("/you", error);
  }
  redirect("/you");
}

export async function organizationAction(formData: FormData) {
  let id = "";
  try {
    const { db, user } = await requireViewer();
    const logo = await storedFile(formData.get("logo"));
    const cover = await storedFile(formData.get("cover"));
    const org = await registerOrganization(db, user.id, {
      name: String(formData.get("name") || ""),
      category: String(formData.get("category") || "club") as "club",
      description: String(formData.get("description") || ""),
      country: String(formData.get("country") || "Tanzania"),
      region: String(formData.get("region") || ""),
      contactPhone: String(formData.get("contactPhone") || ""),
      contactEmail: String(formData.get("contactEmail") || ""),
      logoUrl: logo || String(formData.get("logoUrl") || ""),
      coverUrl: cover || String(formData.get("coverUrl") || ""),
      representativeName: String(formData.get("representativeName") || ""),
      representativePhone: String(formData.get("representativePhone") || ""),
      level: String(formData.get("level") || ""),
      section: String(formData.get("section") || ""),
    });
    id = org.id;
  } catch (error) {
    fail("/clubs/new", error);
  }
  redirect(`/clubs/${id}`);
}

export async function orgRoleAction(formData: FormData) {
  const id = String(formData.get("organizationId"));
  try {
    const { db, user } = await requireViewer();
    const target = String(formData.get("userId"));
    if (formData.get("intent") === "revoke") await revokeOrganizationRole(db, user.id, id, target);
    else await assignOrganizationRole(db, user.id, { organizationId: id, userId: target, role: String(formData.get("role")) as "administrator" });
  } catch (error) {
    fail(`/clubs/${id}`, error);
  }
  redirect(`/clubs/${id}`);
}

export async function businessAction(formData: FormData) {
  let id = "";
  try {
    const { db, user } = await requireViewer();
    const logo = await storedFile(formData.get("logo"));
    const cover = await storedFile(formData.get("cover"));
    const created = await registerBusiness(db, user.id, {
      name: String(formData.get("name") || ""),
      category: String(formData.get("category") || "other"),
      description: String(formData.get("description") || ""),
      location: String(formData.get("location") || ""),
      region: String(formData.get("region") || ""),
      contactPhone: String(formData.get("contactPhone") || ""),
      contactEmail: String(formData.get("contactEmail") || ""),
      logoUrl: logo || String(formData.get("logoUrl") || ""),
      coverUrl: cover || String(formData.get("coverUrl") || ""),
      website: String(formData.get("website") || ""),
      whatsapp: String(formData.get("whatsapp") || ""),
      socialLinks: {
        instagram: String(formData.get("instagram") || "") || undefined,
        facebook: String(formData.get("facebook") || "") || undefined,
      },
      products: String(formData.get("productName") || "")
        ? [{ name: String(formData.get("productName")), description: String(formData.get("productDescription") || ""), priceLabel: String(formData.get("priceLabel") || "") }]
        : [],
    });
    id = created.id;
  } catch (error) {
    fail("/businesses/new", error);
  }
  redirect(`/businesses/${id}`);
}

export async function businessRoleAction(formData: FormData) {
  const id = String(formData.get("businessId"));
  try {
    const { db, user } = await requireViewer();
    const target = String(formData.get("userId"));
    if (formData.get("intent") === "revoke") await revokeBusinessRole(db, user.id, id, target);
    else await assignBusinessRole(db, user.id, { businessId: id, userId: target, role: String(formData.get("role")) as "marketing_manager" });
  } catch (error) {
    fail(`/businesses/${id}`, error);
  }
  redirect(`/businesses/${id}`);
}

export async function enquiryAction(formData: FormData) {
  const id = String(formData.get("businessId"));
  try {
    const { db, user } = await requireViewer();
    await sendEnquiry(db, user.id, id, String(formData.get("message") || ""));
  } catch (error) {
    fail(`/businesses/${id}`, error);
  }
  redirect(`/businesses/${id}`);
}

export async function highlightAction(formData: FormData) {
  const back = String(formData.get("back") || "/you");
  try {
    const { db, user } = await requireViewer();
    await addHighlight(db, user.id, { title: String(formData.get("title") || ""), videoUrl: String(formData.get("videoUrl") || "") });
  } catch (error) {
    fail(back, error);
  }
  redirect(back);
}

export async function shortlistAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    await createShortlist(db, user.id, String(formData.get("name") || "Shortlist"));
  } catch (error) {
    fail("/shortlists", error);
  }
  redirect("/shortlists");
}

export async function shortlistAddAction(formData: FormData) {
  const back = String(formData.get("back") || "/shortlists");
  try {
    const { db, user } = await requireViewer();
    await addToShortlist(db, user.id, String(formData.get("shortlistId")), String(formData.get("playerProfileId")));
  } catch (error) {
    fail(back, error);
  }
  redirect(back);
}

export async function teamAction(formData: FormData) {
  const id = String(formData.get("organizationId"));
  try {
    const { db, user } = await requireViewer();
    await createTeam(db, user.id, id, String(formData.get("name") || ""), String(formData.get("ageGroup") || ""));
  } catch (error) {
    fail(`/clubs/${id}`, error);
  }
  redirect(`/clubs/${id}`);
}

export async function affiliateAction(formData: FormData) {
  const id = String(formData.get("organizationId"));
  try {
    const { db, user } = await requireViewer();
    await affiliateProfile(db, user.id, {
      organizationId: id,
      teamId: String(formData.get("teamId") || "") || undefined,
      profileId: String(formData.get("profileId")),
      role: String(formData.get("role") || "player") as "player",
    });
  } catch (error) {
    fail(`/clubs/${id}`, error);
  }
  redirect(`/clubs/${id}`);
}

export async function announcementAction(formData: FormData) {
  const id = String(formData.get("organizationId"));
  try {
    const { db, user } = await requireViewer();
    await publishAnnouncement(db, user.id, id, String(formData.get("title") || ""), String(formData.get("body") || ""));
  } catch (error) {
    fail(`/clubs/${id}`, error);
  }
  redirect(`/clubs/${id}`);
}

export async function opportunityAction(formData: FormData) {
  const id = String(formData.get("organizationId"));
  try {
    const { db, user } = await requireViewer();
    await createOpportunity(db, user.id, {
      organizationId: id,
      title: String(formData.get("title") || ""),
      kind: String(formData.get("kind") || "trial") as "trial",
      description: String(formData.get("description") || ""),
      region: String(formData.get("region") || ""),
    });
  } catch (error) {
    fail(`/clubs/${id}`, error);
  }
  redirect(`/clubs/${id}`);
}

export async function applyAction(formData: FormData) {
  const id = String(formData.get("opportunityId"));
  try {
    const { db, user } = await requireViewer();
    await applyToOpportunity(db, user.id, id);
  } catch (error) {
    fail(`/opportunities/${id}`, error);
  }
  redirect(`/opportunities/${id}`);
}

export async function applicationStatusAction(formData: FormData) {
  const id = String(formData.get("opportunityId"));
  try {
    const { db, user } = await requireViewer();
    await updateApplicationStatus(db, user.id, String(formData.get("applicationId")), String(formData.get("status")) as "accepted");
  } catch (error) {
    fail(`/opportunities/${id}`, error);
  }
  redirect(`/opportunities/${id}`);
}

export async function videoAction(formData: FormData) {
  let id = "";
  try {
    const { db, user } = await requireViewer();
    const upload = await storedFile(formData.get("file"));
    const sourceUrl = upload || String(formData.get("sourceUrl") || "");
    const video = await uploadVideo(db, user.id, {
      title: String(formData.get("title") || ""),
      sourceUrl,
      profileId: String(formData.get("profileId") || "") || undefined,
    });
    await saveThumbnail(video);
    id = video.id;
  } catch (error) {
    fail("/videos/new", error);
  }
  redirect(`/videos/${id}`);
}

export async function youtubeAction(formData: FormData) {
  const id = String(formData.get("videoId"));
  try {
    const { db, user } = await requireViewer();
    await publishToYouTube(db, user.id, {
      videoId: id,
      destination: String(formData.get("destination") || "player_channel") as "player_channel",
    });
  } catch (error) {
    fail(`/videos/${id}`, error);
  }
  redirect(`/videos/${id}`);
}

export async function retryYoutubeAction(formData: FormData) {
  const videoId = String(formData.get("videoId"));
  try {
    const { db, user } = await requireViewer();
    await retryYouTube(db, user.id, String(formData.get("publicationId")));
  } catch (error) {
    fail(`/videos/${videoId}`, error);
  }
  redirect(`/videos/${videoId}`);
}

export async function authorizeYoutubeAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    await authorizePlayerYouTube(db, user.id, String(formData.get("profileId")));
  } catch (error) {
    fail("/admin", error);
  }
  redirect("/admin?section=youtube");
}

export async function sponsorAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    await createKairukiCampaign(db, user.id, {
      name: String(formData.get("name") || ""),
      body: String(formData.get("body") || ""),
      placement: String(formData.get("placement") || "feed_top") as "feed_top",
      startsAt: formData.get("startsAt") ? new Date(String(formData.get("startsAt"))) : undefined,
      endsAt: formData.get("endsAt") ? new Date(String(formData.get("endsAt"))) : undefined,
    });
  } catch (error) {
    fail("/sponsor", error);
  }
  redirect("/sponsor");
}

export async function adAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    await createBusinessCampaign(db, user.id, {
      businessId: String(formData.get("businessId")),
      name: String(formData.get("name") || ""),
      body: String(formData.get("body") || ""),
      placement: String(formData.get("placement") || "feed_inline") as "feed_inline",
    });
  } catch (error) {
    fail("/campaigns", error);
  }
  redirect("/campaigns");
}

export async function payAdAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    await markCampaignPaid(db, user.id, String(formData.get("campaignId")), String(formData.get("paymentRef") || ""));
  } catch (error) {
    fail("/campaigns", error);
  }
  redirect("/campaigns");
}

export async function reviewAdAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    await reviewBusinessCampaign(db, user.id, String(formData.get("campaignId")), String(formData.get("decision")) as "approved");
  } catch (error) {
    fail("/admin?section=ads", error);
  }
  redirect("/admin?section=ads");
}

export async function clickAction(formData: FormData) {
  const back = String(formData.get("back") || "/");
  try {
    const db = await (await import("@/db/client")).ready();
    await recordCampaignClick(db, String(formData.get("campaignId")));
  } catch (error) {
    fail(back, error);
  }
  redirect(back);
}

export async function verificationAction(formData: FormData) {
  const back = String(formData.get("back") || "/you");
  try {
    const { db, user } = await requireViewer();
    const upload = await storedFile(formData.get("file"));
    await submitVerification(db, user.id, {
      subjectType: String(formData.get("subjectType")) as "organization",
      subjectId: String(formData.get("subjectId")),
      documents: [{ name: String(formData.get("documentName") || "document"), url: upload || String(formData.get("documentUrl") || "") }],
      notes: String(formData.get("notes") || ""),
    });
  } catch (error) {
    fail(back, error);
  }
  redirect(back);
}

export async function reviewVerificationAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    await reviewVerification(db, user.id, {
      applicationId: String(formData.get("applicationId")),
      decision: String(formData.get("decision")) as "approved",
      note: String(formData.get("note") || ""),
    });
  } catch (error) {
    fail("/admin?section=verification", error);
  }
  redirect("/admin?section=verification");
}

export async function moderateAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    await moderatePost(db, user.id, String(formData.get("reportId")), String(formData.get("decision")) as "removed");
  } catch (error) {
    fail("/admin?section=moderation", error);
  }
  redirect("/admin?section=moderation");
}

export async function statusAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    await setAccountStatus(db, user.id, String(formData.get("userId")), String(formData.get("status")) as "active");
  } catch (error) {
    fail("/admin?section=users", error);
  }
  redirect("/admin?section=users");
}

export async function eraseAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    await anonymizeUser(db, user.id, String(formData.get("userId")));
  } catch (error) {
    fail("/admin?section=users", error);
  }
  redirect("/admin?section=users");
}

export async function platformRoleAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    const role = String(formData.get("role")) as PlatformRoleName;
    if (formData.get("intent") === "revoke") await revokePlatformRole(db, user.id, String(formData.get("userId")), role);
    else await grantPlatformRole(db, user.id, String(formData.get("userId")), role);
  } catch (error) {
    fail("/admin?section=roles", error);
  }
  redirect("/admin?section=roles");
}

export async function settingsAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    await updateAccountSettings(db, user.id, {
      language: formData.get("language") === "en" ? "en" : "sw",
      interests: formData.getAll("interest").map(String),
      regions: formData.getAll("region").map(String),
      notificationPrefs: {
        account: formData.get("account") === "on",
        social: formData.get("social") === "on",
        video: formData.get("video") === "on",
        recruitment: formData.get("recruitment") === "on",
        business: formData.get("business") === "on",
        organization: formData.get("organization") === "on",
      },
      privacy: {
        showContact: formData.get("showContact") === "on",
        showPreciseLocation: formData.get("showPreciseLocation") === "on",
        allowRecruitmentContact: formData.get("allowRecruitmentContact") === "on",
      },
    });
  } catch (error) {
    fail("/settings", error);
  }
  redirect("/settings");
}

export async function passwordAction(formData: FormData) {
  try {
    const { db, user } = await requireViewer();
    const token = await changePassword(db, user.id, String(formData.get("current") || ""), String(formData.get("next") || ""));
    await setSession(token);
  } catch (error) {
    fail("/settings", error);
  }
  redirect("/settings");
}

export async function deactivateAction() {
  try {
    const { db, user } = await requireViewer();
    await deactivateAccount(db, user.id);
    await clearSession();
  } catch (error) {
    fail("/settings", error);
  }
  redirect("/welcome");
}

export async function deletionAction() {
  try {
    const { db, user } = await requireViewer();
    await requestDeletion(db, user.id);
    await clearSession();
  } catch (error) {
    fail("/settings", error);
  }
  redirect("/welcome");
}

export async function readAlertsAction() {
  try {
    const { db, user } = await requireViewer();
    await markNotificationsRead(db, user.id);
  } catch (error) {
    fail("/notifications", error);
  }
  redirect("/notifications");
}

export async function lookupUserId(email: string) {
  const db = await (await import("@/db/client")).ready();
  const { users } = await import("@/db/schema");
  const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
  return user?.id ?? "";
}
