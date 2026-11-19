# Notea build plan

**Status:** Implementation plan for SRS 0.3  
**Stack:** Next.js 16 (App Router, React 19, Tailwind 4) and PostgreSQL 18  
**Market:** Tanzania. Languages: Kiswahili (default) and English.  
**Clients:** Mobile-first progressive web app, plus a quieter wide administration desk at `/admin`.

This plan is the build contract. `docs/SRS.md` is the requirements contract. A requirement is done only when the mapped test passes.

## 1. Product shape

Notea should feel like a calm pitch-side notebook, not a busy social network.

- One job per screen. One primary button.
- Phone column first. The community app stays a narrow column on a desktop browser. Administration can widen to a simple two-pane desk.
- Bottom navigation has five stops: Home, Find, Post, Alerts, You.
- Clubs, businesses, trials, videos, shortlists, sponsorship, and settings live inside Find or You. They are not extra tabs.
- Copy is short. Kiswahili is the default. English is one tap away.
- Verified trust is a small mark, shown only after an approved verification. Registration never grants it.
- Private contact details and precise location stay off public pages unless a person explicitly opts in, and never for a minor.

Visual system:

- Paper `#f6f3ec`, ink `#17211c`, line `#e4ddd0`
- Pitch `#0f3d2e`, grass `#1f7a4d`
- One clay action colour `#c4552a`, used for the single primary action
- Fraunces for the wordmark, Outfit for the interface
- Large type, 48px fields, plenty of quiet space

## 2. Architecture

```
src/app            Next.js routes, server actions, PWA manifest
src/components     Mobile shell, forms, feed cards
src/i18n           Kiswahili and English copy
src/db             Drizzle schema, SQL migration, PostgreSQL client
src/domain         Server-side rules. No Next.js imports. This is what tests call.
```

Authorization lives in `src/domain`. Server actions load the session, then call the domain with the authenticated user id. The client never decides a role. Every protected function loads roles from PostgreSQL and checks them again (AUTH-001, AUTH-002, AUTH-003).

### Data

Local PostgreSQL 18 is started with `npm run db:up` on `127.0.0.1:5433`.

- App database: `notea` (`DATABASE_URL`)
- Test database: `notea_test` (`DATABASE_URL_TEST`)
- Each test gets its own schema so files can run together

The schema separates the SRS account concepts:

| Concept | Storage |
|---|---|
| User account | `users`, `sessions`, `verification_codes` |
| Public profile | `profiles` (`fan`, `player`, `coach`, `scout`, `business`) |
| Organization | `organizations`, `organization_members`, `teams`, `affiliations` |
| Business | `businesses`, `business_members`, `products`, `enquiries` |
| Platform roles | `platform_roles` |
| Active identity | `active_contexts` (switch does not create a login) |
| Trust | `verification_applications` |
| Community | `posts`, likes, comments, saves, shares, reports, follows |
| Talent | `highlights`, `shortlists`, `opportunities`, `applications` |
| Video | `videos`, `youtube_publications` |
| Sponsorship | `campaigns` |
| Communication | `notifications` |
| Audit | `audit_logs` |

Passwords use scrypt. Session tokens and verification codes are stored as SHA-256 hashes. Cookies are `httpOnly`, `SameSite=Lax`, and `Secure` in production.

### YouTube

`YouTubePublisher` is an interface.

- `SimulatedYouTubePublisher` is the default and the test double.
- `GoogleYouTubePublisher` calls the YouTube Data API when `YOUTUBE_ACCESS_TOKEN` is set. Tests inject `fetch`.
- Official channel publishing requires `youtube.manage`.
- A player channel requires a platform authorization flag on that player profile.
- The same content hash cannot be published twice to the same destination. Failed jobs can be retried up to three times. Status and the last error are stored.

### Sponsorship

Kairuki Hospital has a sponsor workspace. Educational campaigns use `sponsor_key = kairuki`. Business advertising stays unpaid and unapproved until payment is recorded and an advertising manager approves it. Feeds include a campaign only inside its schedule. Impressions and clicks are counted.

### What is intentionally not a module

Section 9 names competition management as a later introduction and does not specify screens, data, or acceptance rules. This build does not invent that module. Recruitment, clubs, academies, paid advertising, and analytics are specified in section 7, so they are included.

## 3. Permission model

Least privilege. Personal profile roles, organization roles, and business roles do not grant each other.

Platform permissions:

| Permission | Roles |
|---|---|
| `users.read` | super admin, platform admin, customer support, verification officer |
| `users.manage_status` | super admin, platform admin |
| `users.recover` | super admin, platform admin, customer support |
| `users.read_sensitive` | super admin, customer support |
| `users.erase` | super admin |
| `verification.review` | super admin, verification officer |
| `verification.read_documents` | super admin, verification officer |
| `content.moderate` | super admin, content moderator |
| `sponsor.manage` | super admin, sponsor manager |
| `ads.manage` | super admin, advertising manager |
| `ads.report` | super admin, advertising manager, sponsor manager |
| `youtube.manage` | super admin, platform admin |
| `youtube.authorize_player` | super admin, platform admin |
| `roles.grant_platform` | super admin |
| `audit.read` | super admin, platform admin |
| `analytics.read` | super admin, platform admin, advertising manager, sponsor manager |

A user cannot grant themselves a platform role (AUTH-008). The first super admin is created by bootstrap, which only runs while no super admin exists, and the actor recorded on that audit row is the system.

Organization roles: owner, administrator, manager, coach, content manager. Only an explicit `organization_members` row grants them. Following a club or appearing on a team does not.

Business roles: owner, administrator, marketing manager, content manager.

Revocation sets the membership to `revoked`. The next call checks the database, so the person does not need a new account.

## 4. Verification

Registration and verification are different steps.

Account verification is a one-time code for the phone number or email address. Success moves `pending_verification` to `active`.

These stay applications with their own status (`not_submitted`, `pending_review`, `approved`, `rejected`, `more_information_required`, `suspended`):

- Personal identity
- Player information
- Organization
- Business
- Club or academy affiliation

A badge is rendered only for `approved`. Reviewers can approve, reject, ask for more information, or suspend. Each decision is audited.

## 5. Account lifecycle

`pending_verification`, `active`, `restricted`, `suspended`, `deactivated`.

- Unverified people can sign in only to finish verification.
- Restricted people can look but cannot publish.
- Suspended and deactivated people cannot use the product.
- A deactivated person can recover with a code to their phone or email.
- Suspension is lifted by a platform admin or super admin.
- Deletion is a request. The row is retained, the account is deactivated, and only a super admin can later anonymize personal data.

Minors (under 18) need recorded guardian consent before a player profile can be public. Their contact details and precise location are never shown.

## 6. Interface map

Public: `/welcome`, `/register`, `/login`, `/verify`.

After verification: `/onboarding` (language, interests, regions, optional profile types).

Community, all mobile-first:

| Route | Purpose |
|---|---|
| `/` | For you, Following, Trending, Nearby |
| `/compose` | Text, image, or video post as the active identity |
| `/post/[id]` | Comments and actions |
| `/discover` | Search and the short list of places to go |
| `/players`, `/players/[id]` | Talent search, portfolio, shortlist, apply |
| `/clubs/new`, `/clubs/[id]` | Organization profile, team, trials, announcements, admins |
| `/businesses/new`, `/businesses/[id]` | Directory, products, enquiry, managers |
| `/videos/new`, `/videos/[id]` | Upload, playback, rendition, YouTube status |
| `/opportunities/[id]` | Trial or recruitment and applications |
| `/shortlists` | Scout shortlists |
| `/notifications` | Alerts, filtered by preferences |
| `/you` | Profile switcher and profile editor |
| `/settings` | Privacy, notifications, password, deactivate, deletion |
| `/sponsor` | Kairuki workspace |
| `/campaigns` | Business advertising |
| `/admin` | Users, verification, moderation, sponsors, ads, YouTube, analytics, roles, audit |

The PWA manifest, icons, and a small service worker make the site installable and usable offline for the shell.

## 7. Requirement trace

Tests live in `tests/`. Names below are the test titles.

| Requirement | Test |
|---|---|
| REG-001–004, REG-007, acceptance 1–3 | open registration creates a person, club, and business with no admin approval and no badge |
| REG-005, REG-009–011 | general actions wait for phone or email verification |
| REG-006, section 6 | account codes and identity, player, organization, business, and affiliation applications are separate |
| REG-008, SEC-005 | activate, restrict, suspend, deactivate, recover, deletion request |
| REG-012–016 | onboarding selects language, interests, regions, and any subset of profiles, including none |
| REG-017–024, acceptance 7 and 9 | club opens immediately, owner is recorded, documents can be submitted, badge waits for approval, admins can be invited and revoked |
| REG-025–032 | business profile publishes unverified, managers can be invited, paid ads need payment and approval |
| REG-033–037 | several profiles, personal plus business, switch without a new login, posts name the publisher, settings stay separate |
| REG-038–040, AUTH-009 | follow and team membership do not grant ownership; revoked access fails on the next call |
| AUTH-001–006, acceptance 10 | protected calls check database roles; org, business, and personal roles do not cross |
| AUTH-007, AUTH-008, SEC-010, acceptance 12–13 | self-grant fails; role, ownership, and verification changes are audited |
| Section 7.1 | post text, image, and video; categories; like, comment, share, save, report; follow; four feeds; search; autoplay data and rendition choice |
| Section 7.2 | player portfolio, search filters, shortlist, trials, application status, verified versus self-reported |
| Section 7.3 | club profile, teams, affiliations, coaches, announcements, recruitment, org posts |
| Section 7.4 | directory, products, enquiry, verification, paid promotion |
| Section 7.5 | upload, thumbnail, renditions, both YouTube destinations, status, errors, duplicate block, retry |
| Section 7.6 | Kairuki workspace, placements, schedule, business campaigns, approval, impression and click report |
| Section 7.7 | each notification kind, and preferences that suppress them |
| Section 7.8, SEC-008, SEC-009 | admin modules and field-level access for support, verification, and moderation |
| SEC-001–003 | scrypt passwords, hashed session tokens, hashed codes |
| SEC-004, SEC-006, SEC-007 | privacy settings, minor safeguards, hidden contact and precise location by default |
| Acceptance 4–6, 11 | verification completion, multiple profiles, switching, and reviewer decisions |

## 8. Delivery order

1. Foundation: this plan, the SRS, the commit-message rule, Next.js, PostgreSQL.
2. Accounts, sessions, profiles, permissions.
3. Organizations, businesses, verification.
4. Feed, talent, clubs.
5. Video, YouTube, sponsorship, notifications.
6. Administration, audit, privacy.
7. Mobile interface and PWA.
8. Full `npm test`, then a browser pass through registration, feed, talent, club, business, video, sponsor, and admin.

Each implemented slice is committed on its own. Commit messages stay unsigned, as required by `.cursor/rules/commit-messages.mdc`.

## 9. How to run

```bash
npm run db:up
npm test
npm run dev
```

Demo password for seeded people: `notea-demo`.

- `ada@notea.test` super admin
- `fan@notea.test` fan
- `amina@notea.test` player
- `scout@notea.test` scout
- `club@notea.test` club owner
- `shop@notea.test` business owner
- `sponsor@notea.test` Kairuki sponsor manager

With `NOTEA_SHOW_CODES=1`, a newly registered person sees the verification code on the verify screen. Turn that off when a real SMS or email sender is connected.
