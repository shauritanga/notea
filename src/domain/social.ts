import { and, desc, eq } from "drizzle-orm";
import {
  businesses,
  comments,
  follows,
  organizations,
  postLikes,
  postReports,
  postSaves,
  posts,
  profiles,
  shares,
  videos,
} from "@/db/schema";
import { assertAccount, assertBusiness, assertOrg, mustUser } from "@/domain/access";
import { getActiveContext } from "@/domain/accounts";
import { liveCampaigns, recordImpression } from "@/domain/campaigns";
import { newId } from "@/domain/crypto";
import type { Database } from "@/domain/db";
import { AppError } from "@/domain/errors";
import { notify } from "@/domain/notify";
import { contentCategories, type FeedMode } from "@/domain/types";

const interestCategory: Record<string, string> = {
  matches: "match",
  training: "training",
  womens: "women",
  grassroots: "grassroots",
  professional: "highlight",
  business: "business",
  education: "education",
};

async function publisher(db: Database, actorId: string) {
  const context = await getActiveContext(db, actorId);
  if (!context) throw new AppError("profile_required", "Choose who you are posting as");
  if (context.kind === "profile" && context.profileId) {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, context.profileId));
    if (!profile || profile.userId !== actorId) throw new AppError("forbidden", "That profile is not yours");
    return {
      publisherProfileId: profile.id,
      publisherOrganizationId: null,
      publisherBusinessId: null,
      publisherLabel: profile.displayName,
      region: profile.region,
      level: profile.level,
      section: profile.section,
    };
  }
  if (context.kind === "organization" && context.organizationId) {
    await assertOrg(db, actorId, context.organizationId, "org.content");
    const [org] = await db.select().from(organizations).where(eq(organizations.id, context.organizationId));
    return {
      publisherProfileId: null,
      publisherOrganizationId: org.id,
      publisherBusinessId: null,
      publisherLabel: org.name,
      region: org.region,
      level: org.level,
      section: org.section,
    };
  }
  if (context.kind === "business" && context.businessId) {
    await assertBusiness(db, actorId, context.businessId, "biz.content");
    const [business] = await db.select().from(businesses).where(eq(businesses.id, context.businessId));
    return {
      publisherProfileId: null,
      publisherOrganizationId: null,
      publisherBusinessId: business.id,
      publisherLabel: business.name,
      region: business.region,
      level: null,
      section: null,
    };
  }
  throw new AppError("profile_required", "Choose who you are posting as");
}

export async function publishPost(
  db: Database,
  actorId: string,
  input: { kind: "text" | "image" | "video"; category?: string; body: string; mediaUrl?: string; thumbnailUrl?: string; videoId?: string; region?: string },
) {
  await assertAccount(db, actorId, "write");
  const identity = await publisher(db, actorId);
  const category = input.category ?? "general";
  if (!contentCategories.includes(category as (typeof contentCategories)[number])) {
    throw new AppError("invalid_category", "Choose a football category");
  }
  if (input.kind === "image" && !input.mediaUrl) throw new AppError("media_required", "Add an image");
  if (input.kind === "video" && !input.videoId) throw new AppError("media_required", "Add a video");
  if (input.kind === "text" && !input.body.trim()) throw new AppError("body_required", "Write something");
  const id = newId();
  await db.insert(posts).values({
    id,
    authorUserId: actorId,
    ...identity,
    region: input.region ?? identity.region,
    kind: input.kind,
    category,
    body: input.body.trim(),
    mediaUrl: input.mediaUrl ?? null,
    thumbnailUrl: input.thumbnailUrl ?? null,
    videoId: input.videoId ?? null,
    status: "published",
    createdAt: new Date(),
  });
  const [post] = await db.select().from(posts).where(eq(posts.id, id));
  return post;
}

async function mustPublished(db: Database, postId: string) {
  const [post] = await db.select().from(posts).where(eq(posts.id, postId));
  if (!post || post.status !== "published") throw new AppError("not_found", "Post not found");
  return post;
}

export async function likePost(db: Database, actorId: string, postId: string) {
  await assertAccount(db, actorId, "write");
  const post = await mustPublished(db, postId);
  const [existing] = await db.select().from(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, actorId)));
  if (existing) {
    await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, actorId)));
    return;
  }
  await db.insert(postLikes).values({ postId, userId: actorId });
  if (post.authorUserId !== actorId) {
    await notify(db, { userId: post.authorUserId, type: "social", title: "New like", body: `${post.publisherLabel} received a like.` });
  }
}

export async function commentOnPost(db: Database, actorId: string, postId: string, body: string) {
  await assertAccount(db, actorId, "write");
  const post = await mustPublished(db, postId);
  if (!body.trim()) throw new AppError("body_required", "Write a comment");
  const id = newId();
  await db.insert(comments).values({ id, postId, userId: actorId, body: body.trim(), createdAt: new Date() });
  if (post.authorUserId !== actorId) {
    await notify(db, { userId: post.authorUserId, type: "social", title: "New comment", body: body.trim().slice(0, 80) });
  }
  return id;
}

export async function savePost(db: Database, actorId: string, postId: string) {
  await assertAccount(db, actorId, "write");
  await mustPublished(db, postId);
  const [existing] = await db.select().from(postSaves).where(and(eq(postSaves.postId, postId), eq(postSaves.userId, actorId)));
  if (existing) {
    await db.delete(postSaves).where(and(eq(postSaves.postId, postId), eq(postSaves.userId, actorId)));
    return;
  }
  await db.insert(postSaves).values({ postId, userId: actorId });
}

export async function sharePost(db: Database, actorId: string, postId: string) {
  await assertAccount(db, actorId, "write");
  await mustPublished(db, postId);
  await db.insert(shares).values({ postId, userId: actorId, createdAt: new Date() }).onConflictDoNothing();
}

export async function reportPost(db: Database, actorId: string, postId: string, reason: string) {
  await assertAccount(db, actorId, "write");
  await mustPublished(db, postId);
  const id = newId();
  await db.insert(postReports).values({ id, postId, userId: actorId, reason: reason.trim() || "other", status: "open", createdAt: new Date() });
  return id;
}

export async function followTarget(db: Database, actorId: string, targetType: "profile" | "organization" | "business", targetId: string) {
  await assertAccount(db, actorId, "write");
  await db
    .insert(follows)
    .values({ id: newId(), followerUserId: actorId, targetType, targetId, createdAt: new Date() })
    .onConflictDoNothing();
}

export async function toggleFollow(db: Database, actorId: string, targetType: "profile" | "organization" | "business", targetId: string) {
  await assertAccount(db, actorId, "write");
  const [existing] = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerUserId, actorId), eq(follows.targetType, targetType), eq(follows.targetId, targetId)));
  if (existing) {
    await db.delete(follows).where(eq(follows.id, existing.id));
    return;
  }
  await followTarget(db, actorId, targetType, targetId);
}

export async function watchState(db: Database, actorId: string, postId: string, target: { type: string; id: string } | null) {
  const likeRows = await db.select().from(postLikes).where(eq(postLikes.postId, postId));
  const commentRows = await db.select().from(comments).where(eq(comments.postId, postId));
  const saveRows = await db.select().from(postSaves).where(eq(postSaves.postId, postId));
  const shareRows = await db.select().from(shares).where(eq(shares.postId, postId));
  const following = target
    ? (
        await db
          .select()
          .from(follows)
          .where(and(eq(follows.followerUserId, actorId), eq(follows.targetType, target.type), eq(follows.targetId, target.id)))
      ).length > 0
    : false;
  return {
    likes: likeRows.length,
    liked: likeRows.some((row) => row.userId === actorId),
    comments: commentRows.length,
    saves: saveRows.length,
    saved: saveRows.some((row) => row.userId === actorId),
    shares: shareRows.length,
    following,
  };
}

export async function getFeed(db: Database, actorId: string, mode: FeedMode, now = new Date()) {
  const user = await assertAccount(db, actorId, "read");
  const published = await db.select().from(posts).where(eq(posts.status, "published")).orderBy(desc(posts.createdAt));
  const likeRows = await db.select().from(postLikes);
  const commentRows = await db.select().from(comments);
  const shareRows = await db.select().from(shares);
  const myFollows = await db.select().from(follows).where(eq(follows.followerUserId, actorId));
  const score = (postId: string, createdAt: Date) => {
    const likes = likeRows.filter((row) => row.postId === postId).length;
    const commentsOn = commentRows.filter((row) => row.postId === postId).length;
    const shareCount = shareRows.filter((row) => row.postId === postId).length;
    const ageHours = Math.max(1, (now.getTime() - createdAt.getTime()) / 36e5);
    return (likes * 2 + commentsOn * 3 + shareCount) / ageHours;
  };
  const followed = (post: (typeof published)[number]) =>
    myFollows.some((row) => {
      if (row.targetType === "profile") return row.targetId === post.publisherProfileId;
      if (row.targetType === "organization") return row.targetId === post.publisherOrganizationId;
      return row.targetId === post.publisherBusinessId;
    });
  let rows = published;
  if (mode === "following") rows = published.filter(followed);
  if (mode === "nearby") {
    const regions = new Set(user.regions.filter(Boolean));
    rows = published.filter((post) => post.region && regions.has(post.region));
  }
  if (mode === "personalized") {
    const categories = new Set(user.interests.map((interest) => interestCategory[interest] ?? interest));
    const regions = new Set(user.regions);
    rows = published.filter((post) => categories.has(post.category) || (post.region && regions.has(post.region)) || followed(post));
  }
  if (mode === "trending") {
    const cutoff = now.getTime() - 1000 * 60 * 60 * 24 * 14;
    rows = published.filter((post) => post.createdAt.getTime() >= cutoff);
  }
  const ranked = [...rows].sort((a, b) => score(b.id, b.createdAt) - score(a.id, a.createdAt));
  const campaigns = mode === "personalized" || mode === "following" || mode === "trending" || mode === "nearby"
    ? await liveCampaigns(db, now)
    : [];
  const items: Array<{ kind: "post"; post: (typeof ranked)[number] } | { kind: "campaign"; campaign: (typeof campaigns)[number] }> =
    ranked.map((post) => ({ kind: "post", post }));
  const top = campaigns.find((campaign) => campaign.placement === "feed_top");
  const inline = campaigns.find((campaign) => campaign.placement === "feed_inline");
  if (top) items.unshift({ kind: "campaign", campaign: top });
  if (inline) items.splice(Math.min(3, items.length), 0, { kind: "campaign", campaign: inline });
  if (top) await recordImpression(db, top.id);
  if (inline && inline.id !== top?.id) await recordImpression(db, inline.id);
  return items;
}

export async function searchAll(db: Database, actorId: string, query: string) {
  await assertAccount(db, actorId, "read");
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return { profiles: [], organizations: [], businesses: [], posts: [], videos: [] };
  const people = await db.select().from(profiles);
  const orgs = await db.select().from(organizations);
  const shops = await db.select().from(businesses);
  const postRows = await db.select().from(posts);
  const videoRows = await db.select().from(videos);
  const has = (value: string | null | undefined) => (value ?? "").toLowerCase().includes(needle);
  return {
    profiles: people.filter((profile) => profile.visibility === "public" && (has(profile.displayName) || has(profile.bio))),
    organizations: orgs.filter((org) => has(org.name) || has(org.description)),
    businesses: shops.filter((shop) => has(shop.name) || has(shop.description)),
    posts: postRows.filter((post) => post.status === "published" && (has(post.body) || has(post.publisherLabel))),
    videos: videoRows.filter((video) => video.status === "ready" && has(video.title)),
  };
}

export async function listComments(db: Database, postId: string) {
  return db.select().from(comments).where(eq(comments.postId, postId));
}

export async function savedPosts(db: Database, actorId: string) {
  await assertAccount(db, actorId, "read");
  const saves = await db.select().from(postSaves).where(eq(postSaves.userId, actorId));
  const ids = new Set(saves.map((row) => row.postId));
  const all = await db.select().from(posts);
  return all.filter((post) => ids.has(post.id) && post.status === "published");
}

export async function postStats(db: Database, postId: string) {
  const likes = await db.select().from(postLikes).where(eq(postLikes.postId, postId));
  const commentRows = await db.select().from(comments).where(eq(comments.postId, postId));
  const shareRows = await db.select().from(shares).where(eq(shares.postId, postId));
  return { likes: likes.length, comments: commentRows.length, shares: shareRows.length };
}

export async function getPost(db: Database, postId: string) {
  const [post] = await db.select().from(posts).where(and(eq(posts.id, postId), eq(posts.status, "published")));
  return post ?? null;
}

export async function authorName(db: Database, userId: string) {
  const user = await mustUser(db, userId);
  return user.name;
}
