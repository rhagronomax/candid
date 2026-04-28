# Candid Profile Skill
`skills/profile.md` — Read before touching profile fields, the You tab, identity layers, or the Supabase profiles table.

---

## The Profile Is an Identity, Not a Form

Every field on a Candid profile is a deliberate choice about what to reveal and to whom. The profile is not a resume. It is not a dating bio. It is a living, layered representation of a person's authentic self.

**Design principle:** Every field should have a reason to exist that goes beyond "other platforms have this." If a field doesn't contribute to authentic matching or trust-building, it doesn't belong.

---

## Current Schema (`profiles` table)

| Column | Type | Layer | Purpose |
|--------|------|-------|---------|
| `id` | uuid | — | = auth.users.id |
| `name` | text | 1 | Display name |
| `tagline` | text | 1 | Signal — what they want to be found for |
| `current_focus` | text | 1 | Current Chapter — what they're in right now |
| `achievement` | text | 2 | Something built/solved/changed |
| `open_to` | text | 2 | What kind of connection they're looking for |
| `match_mode` | enum | 1 | professional / personal / both |
| `vibe_tags` | array | 2 | Up to 3 personality descriptors |
| `anonymous_mode` | bool | 1 | Whether name/photo is hidden |
| `candid_link` | text | — | candid.so/[slug] — generated from name |
| `photo_url` | text | 1 | Supabase Storage URL (`avatar` bucket) |
| `has_messaged` | bool | — | Whether user has sent first message (Resonance) |
| `created_at` | timestamptz | — | Account creation |
| `updated_at` | timestamptz | — | Last profile update |

---

## Planned Schema Additions

### Facets (separate table)
```sql
CREATE TABLE facets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- user-defined: "Builder", "Researcher", "Human"
  description TEXT NOT NULL,       -- one sentence in first person
  visibility TEXT DEFAULT 'matches', -- 'all' | 'matches' | 'request'
  ai_suggested BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Personality Profiles (separate table)
```sql
CREATE TABLE personality_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  openness FLOAT CHECK (openness BETWEEN 0 AND 1),
  conscientiousness FLOAT CHECK (conscientiousness BETWEEN 0 AND 1),
  extraversion FLOAT CHECK (extraversion BETWEEN 0 AND 1),
  agreeableness FLOAT CHECK (agreeableness BETWEEN 0 AND 1),
  neuroticism FLOAT CHECK (neuroticism BETWEEN 0 AND 1),
  inferred_at TIMESTAMPTZ DEFAULT now()
);
```

### Profile Fields to Add
```sql
-- Phase 2
ALTER TABLE profiles ADD COLUMN contradiction TEXT;     -- "one thing that surprises people"
ALTER TABLE profiles ADD COLUMN living_question TEXT;   -- "question I'm wrestling with right now"
ALTER TABLE profiles ADD COLUMN current_chapter TEXT;   -- replaces current_focus, more personal framing
```

---

## The Layer System

**Layer 1 — Signal** (visible to everyone, even before matching)
- `name` (or "Anonymous" if `anonymous_mode = true`)
- `tagline` (their Signal — most important field)
- `current_focus` / `current_chapter`
- `match_mode`
- Trust Signal bars
- `photo_url` (hidden if `anonymous_mode = true`)

**Layer 2 — Facets** (visible to matches)
- Facets (name + description)
- `achievement`
- `open_to`
- `vibe_tags`

**Layer 3 — Depth** (revealed on request)
- `contradiction`
- `living_question`
- Inflection Points
- Anonymous facet (if user has one)

**Never exposed**
- `personality_profiles` data (OCEAN scores)
- Internal IDs
- Email address

---

## Profile Save (`saveProfile`)

**Always use PATCH, never POST, for updates:**
```javascript
// Strip id from body — Supabase rejects PATCH with PK in body
const { id: _id, ...body } = { id: uid, name, tagline, ... };
await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${uid}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + token },
  body: JSON.stringify(body)
});
```

**Always regenerate `candid_link` on name change:**
```javascript
const candid_link = 'candid.so/' + name.toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'');
```

**Always update display after save:**
- `yc-name` — name in the Your Card header
- `yc-role` — tagline in the Your Card
- `you-name` — name in the You tab
- `you-role` — tagline in the You tab
- `you-link` — candid link

---

## Photo Upload

**Bucket:** `avatar` (lowercase, no s)
**Path:** `{uid}/avatar.{ext}`
**Policy required:** Users can INSERT/UPDATE/DELETE their own folder only

```javascript
// Always delete before re-upload to handle upsert on free tier
await fetch(`${SUPA_URL}/storage/v1/object/avatar/${path}`, {
  method: 'DELETE',
  headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + token }
}).catch(() => {}); // ignore if doesn't exist

// Upload with x-upsert header
const uploadRes = await fetch(`${SUPA_URL}/storage/v1/object/avatar/${path}`, {
  method: 'POST',
  headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': file.type, 'x-upsert': 'true' },
  body: file
});

// Add cache-busting timestamp to URL
const photo_url = `${SUPA_URL}/storage/v1/object/public/avatar/${path}?t=${Date.now()}`;
```

**Always save `photo_url` to profile via PATCH after successful upload.**

---

## Anonymous Mode

When `anonymous_mode = true`:
- Show "Anonymous" instead of name
- Hide photo
- Trust Signal still shows (Suspension decreases — anonymous reduces it)
- Matches still happen — just shown with name hidden

The toggle is a `div` with class `toggle` that gains class `off` when anonymous is disabled (confusing — `off` means anonymous is OFF, i.e., name IS shown).

---

## loadYouTab

Called every time the You tab is opened. Always fetches fresh profile data — never use cached state.

Must populate:
- `you-name` — name display
- `you-role` — tagline display  
- `you-link` — candid link
- `edit-name` — name input
- `edit-tagline` — tagline input
- `edit-focus` — current focus input
- `edit-achievement` — achievement input
- `edit-open-to` — open to input
- `profile-photo-display` — photo (clear first, then set)
- Trust Signal bars (via `previewTrustSignal()`)
- Stats: finds count, chemistry count

---

## What Never To Change

- The `id = auth.users.id` relationship — these must always match
- The `has_messaged` field — it is the Resonance source of truth
- The `anonymous_mode` logic — when true, name and photo are always hidden
- The `candid_link` format: `candid.so/[lowercase-no-spaces]`
- The PATCH-not-POST approach for profile updates
