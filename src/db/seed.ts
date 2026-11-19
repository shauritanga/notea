import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { completeOnboarding, registerIndividual, verifyContact } from "@/domain/accounts";
import { bootstrapSuperAdmin, grantPlatformRole } from "@/domain/admin";
import { registerBusiness } from "@/domain/businesses";
import { createKairukiCampaign } from "@/domain/campaigns";
import type { Database } from "@/domain/db";
import { uploadVideo } from "@/domain/media";
import { registerOrganization } from "@/domain/organizations";
import { publishPost } from "@/domain/social";
import { addHighlight, createOpportunity, createTeam, publishAnnouncement } from "@/domain/talent";

const password = "notea-demo";

async function member(db: Database, email: string, name: string) {
  const registered = await registerIndividual(db, {
    name,
    email,
    password,
    termsAccepted: true,
    language: "sw",
  });
  await verifyContact(db, registered.user.id, registered.codes.email!);
  return registered.user;
}

export async function seedIfEmpty(db: Database) {
  const existing = await db.select().from(users).where(eq(users.email, "ada@notea.test"));
  if (existing.length > 0) return;

  const ada = await member(db, "ada@notea.test", "Ada Mushi");
  const fan = await member(db, "fan@notea.test", "Juma Faraji");
  const amina = await member(db, "amina@notea.test", "Amina Said");
  const scout = await member(db, "scout@notea.test", "Baraka Lema");
  const club = await member(db, "club@notea.test", "Neema Charles");
  const shop = await member(db, "shop@notea.test", "Hassan Ally");
  const sponsor = await member(db, "sponsor@notea.test", "Kairuki Desk");

  await bootstrapSuperAdmin(db, ada.id);
  await grantPlatformRole(db, ada.id, sponsor.id, "sponsor_manager");

  await completeOnboarding(db, fan.id, {
    language: "sw",
    interests: ["matches", "training"],
    regions: ["Dar es Salaam"],
    profileTypes: ["fan"],
  });
  const aminaOnboarding = await completeOnboarding(db, amina.id, {
    language: "sw",
    interests: ["womens", "training"],
    regions: ["Dar es Salaam"],
    profileTypes: ["player"],
    player: {
      position: "forward",
      preferredFoot: "left",
      footballHistory: "School and club football in Dar es Salaam.",
      achievements: "Regional youth cup",
      level: "amateur",
      section: "women",
    },
  });
  await completeOnboarding(db, scout.id, {
    language: "en",
    interests: ["professional"],
    regions: ["Arusha"],
    profileTypes: ["scout"],
  });
  await completeOnboarding(db, club.id, {
    language: "sw",
    interests: ["grassroots"],
    regions: ["Arusha"],
    profileTypes: ["coach"],
  });

  await addHighlight(db, amina.id, { title: "Goal at the near post", videoUrl: "https://cdn.notea.test/amina-goal.mp4" });
  await uploadVideo(db, amina.id, {
    title: "Goal at the near post",
    sourceUrl: "https://cdn.notea.test/amina-goal.mp4",
    profileId: aminaOnboarding.profileIds[0],
  });
  await publishPost(db, amina.id, {
    kind: "text",
    category: "highlight",
    body: "Full training session this evening. Left foot is feeling sharp.",
    region: "Dar es Salaam",
  });
  await publishPost(db, fan.id, {
    kind: "text",
    category: "match",
    body: "The stand was loud today. Women's football deserves this crowd every week.",
    region: "Dar es Salaam",
  });

  const org = await registerOrganization(db, club.id, {
    name: "Arusha United",
    category: "club",
    description: "A community club for girls and boys, from school football to the first team.",
    region: "Arusha",
    level: "amateur",
    section: "open",
    representativeName: "Neema Charles",
  });
  await createTeam(db, club.id, org.id, "First team");
  await createOpportunity(db, club.id, {
    organizationId: org.id,
    title: "Open trial, attackers",
    kind: "trial",
    description: "Saturday 08:00 at the municipal ground. Bring boots and water.",
    region: "Arusha",
  });
  await publishAnnouncement(db, club.id, org.id, "Training on Thursday", "Meet at the far pitch. Goalkeepers arrive 20 minutes early.");

  await registerBusiness(db, shop.id, {
    name: "Pitch and Boots",
    category: "kit",
    description: "Boots, balls, and training kit for clubs around Arusha.",
    location: "Soko Kuu, Arusha",
    region: "Arusha",
    whatsapp: "https://wa.me/255700111222",
    products: [{ name: "Firm-ground boots", description: "Sizes 36 to 45", priceLabel: "TZS 85000" }],
  });

  await createKairukiCampaign(db, sponsor.id, {
    name: "Warm up before you play",
    body: "Ten minutes of warming up cuts the chance of a muscle injury. Kairuki Hospital.",
    placement: "feed_top",
  });
}
