# Software Requirements Specification (SRS)

**Product:** Notea  
**Version:** 0.3  
**Status:** Working Draft – For Review  
**Product identity:** Complete Football Ecosystem  
**Initial market:** Tanzania  
**Languages:** Kiswahili and English  
**Platforms:** Mobile application and web-based administration portal  
**Founding sponsor:** Kairuki Hospital

---

# 1. Product Overview

Notea is a complete football ecosystem connecting players, fans, coaches, scouts, clubs, academies, businesses and sponsors through one digital platform.

The platform will provide football content sharing, talent discovery, football networking, business promotion, sponsorship and video distribution.

Notea shall support football at all levels, including school, grassroots, amateur, semi-professional and professional football, as well as women's football.

## 1.1 Product Objectives

1. Connect the football community.
2. Give players opportunities to showcase their abilities.
3. Connect players with clubs, academies and scouts.
4. Provide football organizations with digital profiles and communication tools.
5. Enable businesses to promote their products and services.
6. Distribute authorized football videos through YouTube.
7. Provide sponsors with managed content and campaign placements.
8. Build a sustainable football-focused digital ecosystem.

# 2. User and Account Management

## 2.1 Open Registration Policy

**REG-001:** Notea shall support open registration for individuals, football organizations and businesses.

**REG-002:** Registration shall not require prior administrative approval.

**REG-003:** Individuals shall be able to register using a phone number or email address.

**REG-004:** Organizations and businesses shall be able to register through the available registration process and create their respective profiles.

**REG-005:** Users shall be able to access general platform features after completing the required account verification.

**REG-006:** The system shall distinguish account registration, identity verification, organization verification, business verification and authorization to perform restricted activities.

**REG-007:** Registration shall not automatically grant a verified badge or privileged administrative permissions.

**REG-008:** The system shall support account activation, suspension, restriction, deactivation and recovery.

## 2.2 Account Structure

The system shall maintain separate concepts for:

### A. User Account

Represents the registered person who authenticates into Notea.

It shall contain:

- Unique account identifier.
- Login credentials and authentication methods.
- Phone number and/or email address.
- Account verification status.
- Account status.
- Security settings.
- Language preference.
- Notification preferences.
- Privacy and consent settings.

### B. Public Profile

Represents the identity displayed to other Notea users.

Supported profile types shall include:

- Fan profile.
- Player profile.
- Coach profile.
- Scout profile.
- Business profile.

A person may maintain multiple authorized profile types under one user account.

### C. Organization Account

Represents a registered football organization, such as:

- Football club.
- Football academy.
- Football team.
- Football association or other approved football institution.

An organization shall have its own identity, profile, administrators and membership relationships.

### D. Business Account

Represents a registered commercial entity or business operating on Notea.

It shall have its own business profile, authorized managers, business information and promotional capabilities.

### E. Roles and Permissions

Roles determine the responsibilities assigned to a user. Permissions determine the specific actions that user is allowed to perform.

The system shall support role-based authorization.

# 3. Registration Requirements

## 3.1 Individual Registration

**REG-009:** Individuals shall be able to register using a phone number or email address.

**REG-010:** The registration process shall collect the minimum information necessary to create an account.

**REG-011:** Users shall verify their phone number or email address through an appropriate verification mechanism.

**REG-012:** After registration, users shall be able to select one or more relevant profile types.

**REG-013:** Users shall be able to complete additional profile information after registration.

**REG-014:** Users shall be able to select Kiswahili or English.

**REG-015:** Users shall be able to select football interests and preferred regions.

**REG-016:** The system shall not require every user to complete a player, coach or scout profile.

## 3.2 Organization Registration

**REG-017:** Any eligible organization shall be able to register without prior administrative approval.

**REG-018:** Organization registration shall collect:

- Organization name.
- Organization category.
- Description.
- Country and operating region.
- Contact information.
- Logo and profile image.
- Authorized representative information.

**REG-019:** The registering individual shall become the initial organization owner or administrator.

**REG-020:** The organization shall be able to create its public profile immediately, subject to applicable platform restrictions.

**REG-021:** The organization shall be able to submit supporting documents for verification.

**REG-022:** The organization shall be able to invite additional authorized administrators.

**REG-023:** The system shall maintain a record of organization ownership and administrator assignments.

**REG-024:** An organization shall not receive a verified badge until its verification application is approved.

## 3.3 Business Registration

**REG-025:** Any eligible business shall be able to register without prior administrative approval.

**REG-026:** Business registration shall collect:

- Business name.
- Business category.
- Business description.
- Location.
- Contact details.
- Logo and cover image.
- Products or services, where applicable.
- Website, WhatsApp and social media links, where available.

**REG-027:** The registering user shall become the initial business owner or administrator.

**REG-028:** A business shall be able to publish its profile after completing registration.

**REG-029:** Businesses shall be able to submit supporting documents for verification.

**REG-030:** The system shall distinguish verified businesses from unverified businesses.

**REG-031:** Businesses shall be able to invite authorized managers, where supported.

**REG-032:** Access to paid advertising and other restricted commercial services shall be subject to the applicable approval and payment requirements.

# 4. Multiple Profiles and Account Relationships

**REG-033:** One user account shall be capable of managing multiple profiles.

**REG-034:** A user shall be able to maintain both personal and business identities.

**REG-035:** A user shall be able to switch between profiles without creating separate login accounts.

**REG-036:** Publishing actions shall identify which profile is publishing the content.

**REG-037:** The system shall maintain separate profile settings, visibility and permissions.

**REG-038:** Users shall not automatically gain ownership of an organization merely because they follow it or belong to it.

**REG-039:** Organization ownership and administration shall be controlled through explicit role assignments.

**REG-040:** The system shall support revoking access when an administrator or manager leaves an organization.

# 5. Roles and Authorization

## 5.1 Individual Roles

The system shall support the following roles:

| Role | Main capabilities |
|---|---|
| Fan | View, follow and interact with football content |
| Player | Manage football profile and publish highlights |
| Coach | Manage coach profile and authorized activities |
| Scout | Discover players and manage shortlists |
| Business Owner | Manage business profile and services |

A user may have multiple roles.

## 5.2 Organization Roles

The system shall support organization-level roles:

| Role | Main responsibilities |
|---|---|
| Owner | Full control over organization account |
| Administrator | Manage organization operations |
| Manager | Manage assigned activities |
| Coach | Manage permitted team and player activities |
| Content Manager | Publish organization content |

The organization owner shall be able to assign and revoke permissions within the limits established by the platform.

## 5.3 Business Roles

Business accounts shall support:

- Business Owner.
- Business Administrator.
- Marketing Manager.
- Content Manager.

The business owner shall control the assignment of business permissions.

## 5.4 Platform Roles

The system shall support:

- Super Administrator.
- Platform Administrator.
- Content Moderator.
- Verification Officer.
- Advertising Manager.
- Sponsor Manager.
- Customer Support Officer.

Platform roles shall have restricted and clearly defined permissions.

## 5.5 Authorization Requirements

**AUTH-001:** The system shall enforce permissions on the server side.

**AUTH-002:** Users shall only perform actions authorized by their assigned roles and permissions.

**AUTH-003:** Permissions shall be checked for every protected operation.

**AUTH-004:** Organization permissions shall be independent of personal profile roles.

**AUTH-005:** Business permissions shall be independent of organization permissions.

**AUTH-006:** The system shall apply least-privilege access principles.

**AUTH-007:** Sensitive administrative operations shall be recorded in audit logs.

**AUTH-008:** A user shall not be able to grant themselves platform administrator privileges.

**AUTH-009:** Revoked roles and permissions shall take effect without requiring the affected user to create a new account.

# 6. Verification and Trust Management

Registration and verification shall be separate processes.

The system shall support:

1. Phone verification.
2. Email verification.
3. Personal identity verification, where required.
4. Player information verification.
5. Organization verification.
6. Business verification.
7. Official club or academy affiliation verification.

Verification shall have statuses such as:

- Not Submitted.
- Pending Review.
- Approved.
- Rejected.
- More Information Required.
- Suspended.

Administrators shall be able to review applications, request additional documents and record verification decisions.

A verified badge shall only be displayed when the applicable verification requirements have been satisfied.

# 7. Other Functional Modules

The following modules remain within the overall Notea product scope.

## 7.1 Football Media and Social Community

- Publish videos, images and text posts.
- Support football content categories.
- Like, comment, share, save and report posts.
- Follow players, clubs, academies and businesses.
- Provide personalized, following, trending and nearby feeds.
- Support video autoplay and adaptive streaming.
- Provide content discovery and search.

## 7.2 Player Profiles and Talent Discovery

- Player football profiles and portfolios.
- Position, preferred foot and football history.
- Highlight videos and achievements.
- Player search and filtering.
- Scout shortlists.
- Recruitment and trial opportunities.
- Applications and recruitment status.
- Verified versus self-reported information.

## 7.3 Clubs and Academies

- Organization profiles.
- Teams and player affiliations.
- Coaches and management.
- Announcements.
- Recruitment and trials.
- Organization content publishing.

## 7.4 Business Hub

- Business directories.
- Business profiles.
- Products and services.
- Business content.
- Contact and enquiry mechanisms.
- Business verification.
- Paid promotion.

## 7.5 Video and YouTube Integration

- Video uploads and processing.
- Thumbnail generation.
- Official Notea YouTube publishing.
- Authorized individual player YouTube publishing.
- Publishing destination selection.
- Publishing status and error tracking.
- Duplicate prevention and retry mechanisms.

## 7.6 Sponsorship and Advertising

- Dedicated Kairuki Hospital sponsor workspace.
- Sponsored educational content.
- Configurable feed placements.
- Campaign scheduling.
- Business advertising campaigns.
- Approval and moderation.
- Campaign reporting.

## 7.7 Notifications and Communication

- Account notifications.
- Social activity notifications.
- Video publishing updates.
- Recruitment notifications.
- Business enquiries.
- Organization announcements.
- Notification preferences.

## 7.8 Administration

- User management.
- Organization and business verification.
- Content moderation.
- Sponsor management.
- Advertising management.
- YouTube integration management.
- Reports and analytics.
- Roles and permissions.
- Audit logs.

# 8. Account Security and Privacy

**SEC-001:** Passwords shall be securely hashed.

**SEC-002:** Authentication sessions shall be managed securely.

**SEC-003:** Sensitive information shall be protected in transit and at rest.

**SEC-004:** Users shall be able to manage their privacy settings.

**SEC-005:** Users shall be able to request account deactivation or deletion, subject to applicable legal and retention requirements.

**SEC-006:** The platform shall protect minors through appropriate privacy, guardian-consent and safeguarding controls.

**SEC-007:** Public profiles shall not expose private contact information or precise location by default.

**SEC-008:** Organization and business administrators shall only access information relevant to their authorized responsibilities.

**SEC-009:** Platform administrators shall have controlled access to sensitive records.

**SEC-010:** The system shall record important changes to ownership, roles, permissions and verification status.

# 9. Initial Release Scope

The MVP shall include:

1. Open individual, organization and business registration.
2. Account authentication and verification.
3. Multiple profiles under one account.
4. Role and permission management.
5. Fan and player profiles.
6. Football social feed.
7. Video upload and playback.
8. YouTube publishing integrations.
9. Business profiles and content.
10. Kairuki sponsored content.
11. Basic verification workflows.
12. Administration and moderation.

Advanced recruitment, club and academy management, paid advertising, competition management and advanced analytics shall be introduced progressively.

This working build implements the full SRS functional scope, including the modules listed for progressive introduction, so every highlighted function can be exercised and tested.

# 10. Acceptance Criteria

The account and registration subsystem shall be accepted when:

1. An individual can register without prior administrative approval.
2. An organization can register without prior administrative approval.
3. A business can register without prior administrative approval.
4. Each account can complete the required verification process.
5. Users can maintain multiple authorized profiles.
6. Users can switch between profiles.
7. Organization owners can invite and manage administrators.
8. Business owners can manage authorized business users.
9. Unverified organizations and businesses are distinguishable from verified ones.
10. Restricted operations are protected by server-side authorization.
11. Administrators can review verification applications.
12. Revoked permissions prevent further unauthorized actions.
13. Sensitive administrative changes are auditable.

---

**End of SRS Version 0.3 – Working Draft**
