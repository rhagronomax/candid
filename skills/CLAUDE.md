# CLAUDE.md — Candid Project Constitution
> Read this before touching anything. Every decision should be consistent with what's written here.

---

## What Candid Is

Candid is a trust-calibrated digital identity platform. It is not a dating app. It is not LinkedIn. It is the first platform where your whole, complex, multidimensional self is an asset to be discovered — not a liability to be managed.

**The core thesis:** You are one person. Your context shouldn't be an act — it should be a choice of what you highlight. Candid gives you that choice through layered, intentional identity disclosure powered by personality inference and the Trust Ecology Framework.

**The problem it solves:** Identity fatigue. People maintain multiple personas across platforms — professional mask on LinkedIn, romantic persona on dating apps, curated highlight reel on Instagram. None of them are complete. Candid is the first platform designed for the whole person.

---

## Theoretical Grounding

Candid is built on the **Trust Ecology Framework (TEF)** — a triadic model of trust developed by Rachel Hor as part of her EDBA dissertation at the Sobey School of Business, Saint Mary's University.

**The three dimensions:**
- **Legibility (L)** — How clearly and consistently identity is expressed. Rewards authenticity, not performance.
- **Suspension (S)** — The capacity to hold complexity. A high-Suspension environment is where genuine connection becomes possible.
- **Resonance (R)** — What emerges when two authentic selves actually meet. Tracked through real interaction, not predicted in advance.

These map directly to the Trust Signal — the visual indicator shown on every profile and match card.

**Personality substrate:** The Big Five (OCEAN) dimensions are inferred from the onboarding conversation — never self-reported, never shown to users. They are invisible infrastructure that makes the visible experience feel surprisingly right.

---

## Product Architecture

### The Layered Identity Model

**Layer 1 — Signal** (always visible)
- One-line identity statement (what you want to be found for)
- Current Chapter (what you're in right now, not what you've done)
- Match mode (professional / personal / both)
- Trust Signal (Legibility, Suspension, Resonance bars)

**Layer 2 — Facets** (visible to matches)
- 2-3 user-defined facets (name + description)
- AI-suggested based on onboarding, user edits freely
- What they've built / solved
- What they're open to
- Vibe tags

**Layer 3 — Depth** (revealed on request)
- Fuller personal context
- Contradiction Field ("one thing about me that surprises people")
- Question they're living with
- Inflection Points (moments that shaped them)
- Anonymous facet option

**Invisible substrate** (never shown)
- Big Five OCEAN scores inferred from conversation
- Facet-to-facet resonance scores between users
- Resonance log events

### The Reveal Mechanic
Connecting is a two-step gesture:
1. You see someone's Signal and request their next layer
2. They receive a notification and choose to reveal or not
3. When requesting, you write one sentence about why

This is the primary trust filter — it removes low-intent connections before they waste anyone's time.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Single HTML file (`candid/public/index.html`) |
| Fonts | Fraunces (serif display) + DM Sans (body) via Google Fonts |
| Backend functions | Netlify serverless functions (`candid/netlify/functions/`) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (`avatar` bucket) |
| AI | Anthropic Claude API via `/api/claude` proxy |
| Hosting | Netlify (auto-deploys from GitHub `main` branch) |
| Repo | github.com/rhagronomax/candid |

### Supabase Project
- URL: `https://sttkixdqnetxkritldzh.supabase.co`
- Anon key: stored in `index.html` as `SUPA_KEY`
- Service key: stored in Netlify env as `SUPABASE_SERVICE_KEY`
- Anthropic key: stored in Netlify env as `ANTHROPIC_API_KEY`

### Netlify Functions
- `/api/claude` — Claude proxy (onboarding, starters, tagline generation)
- `/api/matches` — GET (load matches), POST (generate new), DELETE (dismiss)
- `/api/messages` — GET (load threads), POST (send message)
- `/api/notify` — POST (email notifications via Resend)

---

## Database Schema

### Core Tables

```sql
profiles          -- core identity record
facets            -- user-defined identity layers (2-3 per user)
personality_profiles -- Big Five OCEAN scores (inferred, never shown)
matches           -- AI-generated matches with facet context
reveal_requests   -- layer reveal gesture between two users
messages          -- persistent chat messages
resonance_log     -- every meaningful interaction event
```

### Key Relationships
- `profiles.id` = `auth.users.id` (always)
- `facets.profile_id` → `profiles.id`
- `personality_profiles.profile_id` → `profiles.id` (unique)
- `matches.user_id` + `matches.matched_user_id` → `profiles.id`
- `matches.facet_id` → `facets.id` (nullable — which facet triggered the match)
- `messages.facet_context` → `facets.id` (nullable — which facet initiated conversation)
- `resonance_log` → tracks events across all interaction types

### RLS Policy Principle
Users can only see what they're meant to see at each layer. Personality data is never exposed via RLS — only accessible server-side via service key in Netlify functions.

---

## Design System

See `skills/design.md` for the full design system. Core tokens:

```css
--bg: #0a0a0a          /* near-black background */
--warm: #111111        /* card/surface color */
--sand: #1a1a1a        /* elevated surface */
--ink: #000000         /* pure black (for light backgrounds) */
--white: #f0f0f0       /* primary text */
--muted: #888888       /* secondary text */
--line: rgba(255,255,255,0.08)  /* borders */
--vibe: #00FFB2        /* primary accent — Vibe level */
--connect: #00ccff     /* Connection level */
--chem: #ff3cac        /* Chemistry level — highest */
```

**Typography:**
- Display/headings: `Fraunces` (serif, expressive)
- Body/UI: `DM Sans` (clean, modern)
- Never use: Inter, Roboto, Arial, system fonts

**Never change:**
- The color token names — they are referenced throughout the codebase
- The Trust Signal visual logic — Legibility (green), Suspension (blue), Resonance (pink)
- The match level hierarchy — Vibe < Connection < Chemistry
- The three-question onboarding structure

---

## Code Conventions

### JavaScript
- All state variables declared at the top of the script block, once, never duplicated
- Functions defined in this order: helpers → supabase → UI → auth → onboarding → matches → messaging → profile → navigation
- `async/await` throughout — no `.then()` chains in new code
- Every Supabase call wrapped in try/catch
- `myUserId()` for getting current user ID — never inline JWT parsing
- `authHeaders()` for auth headers — never inline
- `showToast(msg, type)` for user feedback — never `alert()`

### Naming
- Functions: camelCase, verb-first (`loadMessages`, `openMatch`, `sendMessage`)
- IDs: kebab-case (`msg-thread`, `profile-photo-display`, `find-more-btn`)
- CSS variables: kebab-case with `--` prefix
- Supabase tables: snake_case

### What Never To Do
- Never use `alert()` — use `showToast()`
- Never declare the same variable twice in the same scope
- Never call `loadMessages` before it's defined in the file (hoisting issue)
- Never hardcode user IDs or profile data
- Never expose the service key in client-side code
- Never use `innerHTML` with unsanitised user input for security-sensitive elements
- Never patch the same function more than once — rewrite it cleanly

---

## Deployment Process

1. Make changes to files in `~/Desktop/candid/`
2. Verify with grep that key functions are present and not duplicated
3. `git add -A && git commit -m "description" && git push`
4. Netlify auto-deploys from `main` branch — check app.netlify.com/projects/b-candid
5. Test on live site before considering done

**Before every deploy, verify:**
```bash
grep -c "function myUserId" ~/Desktop/candid/candid/public/index.html  # should be 1
grep -c "let conversations" ~/Desktop/candid/candid/public/index.html  # should be 1
grep -c "const convKey" ~/Desktop/candid/candid/public/index.html      # should be 1
```

---

## What To Read Next

Before working on any specific area, read the relevant skill:

| Task | Read |
|------|------|
| Onboarding conversation | `skills/onboarding.md` |
| Match generation | `skills/matching.md` |
| Trust Signal | `skills/trust-signal.md` |
| Profile and identity layers | `skills/profile.md` |
| Messaging and chat | `skills/messaging.md` |
| Design and UI | `skills/design.md` |
| Deployment | `skills/deploy.md` |

---

## Who Built This

**Rachel Hor** — Founder, Candid. EDBA candidate at Sobey School of Business, Saint Mary's University. Dissertation: "Trust Ecology: Calibrating Triadic, Processual Trust in Socio-Algorithmic Decision Systems."

The TEF framework is grounded in a Campbell Collaboration systematic review (Manuscript ID cl2.20260007) across 66 studies, ~31,000 participants, g=0.225, p=0.023.
