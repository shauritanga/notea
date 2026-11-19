export const migrationSql = `
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  phone text UNIQUE,
  email text UNIQUE,
  password_hash text NOT NULL,
  language text NOT NULL DEFAULT 'sw',
  status text NOT NULL DEFAULT 'pending_verification',
  phone_verified_at timestamptz,
  email_verified_at timestamptz,
  date_of_birth date,
  is_minor boolean NOT NULL DEFAULT false,
  guardian_name text,
  guardian_consent_at timestamptz,
  notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  privacy jsonb NOT NULL DEFAULT '{}'::jsonb,
  interests text[] NOT NULL DEFAULT '{}',
  regions text[] NOT NULL DEFAULT '{}',
  terms_accepted_at timestamptz NOT NULL,
  onboarded_at timestamptz,
  deletion_requested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verification_codes (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  display_name text NOT NULL,
  bio text NOT NULL DEFAULT '',
  region text,
  country text NOT NULL DEFAULT 'Tanzania',
  avatar_url text,
  cover_url text,
  visibility text NOT NULL DEFAULT 'public',
  verified_status text NOT NULL DEFAULT 'not_submitted',
  position text,
  preferred_foot text,
  football_history text,
  achievements text,
  level text,
  section text,
  contact_phone text,
  contact_email text,
  precise_location text,
  privacy jsonb NOT NULL DEFAULT '{}'::jsonb,
  youtube_authorized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_one_personal_type
  ON profiles (user_id, type)
  WHERE type <> 'business';

CREATE TABLE IF NOT EXISTS organizations (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'Tanzania',
  region text NOT NULL,
  contact_phone text,
  contact_email text,
  logo_url text,
  cover_url text,
  verified_status text NOT NULL DEFAULT 'not_submitted',
  level text,
  section text,
  representative_name text NOT NULL,
  representative_phone text,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS businesses (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text NOT NULL,
  region text,
  country text NOT NULL DEFAULT 'Tanzania',
  contact_phone text,
  contact_email text,
  logo_url text,
  cover_url text,
  website text,
  whatsapp text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_status text NOT NULL DEFAULT 'not_submitted',
  show_public_contact boolean NOT NULL DEFAULT false,
  precise_location text,
  profile_id text REFERENCES profiles(id),
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_members (
  id text PRIMARY KEY,
  business_id text NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  business_id text NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_label text
);

CREATE TABLE IF NOT EXISTS platform_roles (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  granted_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS active_contexts (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  profile_id text REFERENCES profiles(id),
  organization_id text REFERENCES organizations(id),
  business_id text REFERENCES businesses(id)
);

CREATE TABLE IF NOT EXISTS verification_applications (
  id text PRIMARY KEY,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  applicant_user_id text NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'pending_review',
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  reviewer_id text,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id text PRIMARY KEY,
  author_user_id text NOT NULL REFERENCES users(id),
  publisher_profile_id text REFERENCES profiles(id),
  publisher_organization_id text REFERENCES organizations(id),
  publisher_business_id text REFERENCES businesses(id),
  publisher_label text NOT NULL,
  kind text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  body text NOT NULL DEFAULT '',
  media_url text,
  thumbnail_url text,
  region text,
  video_id text,
  status text NOT NULL DEFAULT 'published',
  sponsored_campaign_id text,
  level text,
  section text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_saves (
  post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id text PRIMARY KEY,
  post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_reports (
  id text PRIMARY KEY,
  post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shares (
  post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS follows (
  id text PRIMARY KEY,
  follower_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_user_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS highlights (
  id text PRIMARY KEY,
  profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  video_url text,
  self_reported boolean NOT NULL DEFAULT true,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shortlists (
  id text PRIMARY KEY,
  scout_profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shortlist_items (
  shortlist_id text NOT NULL REFERENCES shortlists(id) ON DELETE CASCADE,
  player_profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (shortlist_id, player_profile_id)
);

CREATE TABLE IF NOT EXISTS opportunities (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL,
  description text NOT NULL DEFAULT '',
  region text,
  status text NOT NULL DEFAULT 'open',
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id text PRIMARY KEY,
  opportunity_id text NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  player_profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, player_profile_id)
);

CREATE TABLE IF NOT EXISTS teams (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  age_group text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS affiliations (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id text REFERENCES teams(id) ON DELETE SET NULL,
  profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL,
  verified_status text NOT NULL DEFAULT 'not_submitted',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enquiries (
  id text PRIMARY KEY,
  business_id text NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  from_user_id text NOT NULL REFERENCES users(id),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS videos (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES users(id),
  profile_id text REFERENCES profiles(id),
  title text NOT NULL,
  source_url text NOT NULL,
  thumbnail_url text,
  content_hash text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  renditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS youtube_publications (
  id text PRIMARY KEY,
  video_id text NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  external_id text,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, destination)
);

CREATE TABLE IF NOT EXISTS campaigns (
  id text PRIMARY KEY,
  owner_type text NOT NULL,
  business_id text REFERENCES businesses(id) ON DELETE CASCADE,
  sponsor_key text,
  name text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL,
  placement text NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  payment_status text NOT NULL DEFAULT 'not_required',
  payment_ref text,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id text PRIMARY KEY,
  actor_user_id text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;
