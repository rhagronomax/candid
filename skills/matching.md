# Candid Matching Skill
`skills/matching.md` — Read before touching match generation, the matches function, or match card rendering.

---

## Matching Philosophy

Candid matches are not search results. They are introductions — curated, reasoned, and specific. Every match should feel like someone who knows both people thought carefully about why they should meet.

**The match reason is the product.** Not the profile. Not the score. The one-sentence reason that explains why these two specific people, right now, make sense.

---

## Match Types

Three levels, in ascending order of signal strength:

| Type | Label | Color | Meaning |
|------|-------|-------|---------|
| `vibe` | ○ Vibe | `#00FFB2` | Interesting overlap — worth exploring |
| `connection` | ● Connection | `#00ccff` | Meaningful alignment — real potential |
| `chemistry` | ✦ Chemistry | `#ff3cac` | Rare resonance — don't ignore this |

**Determining match type:**
- Chemistry: high OCEAN compatibility + strong facet overlap + complementary current chapters
- Connection: good OCEAN alignment + at least one strong facet match
- Vibe: thematic overlap without strong personality alignment, or early signal only

When in doubt, generate `connection`. Never generate Chemistry for more than 20% of matches — it loses meaning if overused.

---

## The `/api/matches` Function

### GET — Load existing matches
```javascript
// Fetch non-dismissed matches with joined profile data
`/rest/v1/matches?user_id=eq.${userId}&status=neq.dismissed
  &select=*,matched_profile:profiles!matches_matched_user_id_fkey(
    id,name,tagline,achievement,open_to,vibe_tags,anonymous_mode,
    current_focus,photo_url,has_messaged
  )&order=created_at.desc`
```

### POST — Generate new matches
1. Fetch the requesting user's full profile
2. Fetch all profiles not already matched with this user (exclude dismissed too)
3. For each candidate (max 5 per call), generate a match reason via Claude
4. Create the match record
5. Create the mutual reverse match (B→A) if it doesn't exist
6. Return the new matches

### DELETE — Dismiss a match
PATCH the match record to `status = 'dismissed'`. Never hard delete — dismissed matches inform future matching exclusions.

---

## Match Reason Generation

```javascript
// Claude prompt — keep it tight, specific, under 25 words
const prompt = `
Match reason (max 20 words) and type (chemistry/connection/vibe) for:
A: ${myProfile.name}, ${myProfile.tagline}. Currently: ${myProfile.current_focus}.
B: ${candidate.name}, ${candidate.tagline}. Currently: ${candidate.current_focus}.

JSON only: {"reason":"...","type":"..."}

Rules:
- Reason must be specific to THESE two people — no generic "shared interests"
- Reference what they're both working on or open to
- Write as if explaining to a mutual friend why they should meet
- Never start with "Both" — vary the structure
`;
```

**Good match reasons:**
- "She's building the governance framework his AI system needs someone to challenge."
- "You're on opposite sides of the same problem — algorithmic trust in financial services."
- "His exit gives him exactly the perspective her Series A questions need."

**Bad match reasons:**
- "Both are interested in AI and have professional backgrounds."
- "Shared focus on technology and innovation."
- "Similar professional goals and open to collaboration."

---

## Facet-Aware Matching (Phase 2)

When facets are implemented, match reason generation should reference specific facets:

```javascript
const prompt = `
Match reason referencing specific facets:
A facets: ${myFacets.map(f => f.name + ': ' + f.description).join(' | ')}
B facets: ${candidateFacets.map(f => f.name + ': ' + f.description).join(' | ')}

Which facet pairing is most compelling? Reference it specifically.
JSON: {"reason":"...","type":"...","facet_a":"...","facet_b":"..."}
`;
```

Store `facet_id` on the match record — it drives the reveal request UI.

---

## OCEAN-Weighted Matching (Phase 2)

When personality profiles exist, weight candidates by OCEAN compatibility:

```javascript
function oceanCompatibility(a, b) {
  // High compatibility = complementary, not identical
  // Openness: similar levels work well
  // Conscientiousness: similar levels reduce friction
  // Extraversion: complementary (one slightly higher) is energising
  // Agreeableness: both high = warm; both low = friction
  // Neuroticism: lower combined = more stable dynamic
  
  const opennessDiff = Math.abs(a.openness - b.openness);
  const conscientiousness = 1 - Math.abs(a.conscientiousness - b.conscientiousness);
  const extraversion = 1 - Math.abs(Math.abs(a.extraversion - b.extraversion) - 0.2);
  const agreeableness = (a.agreeableness + b.agreeableness) / 2;
  const stability = 1 - ((a.neuroticism + b.neuroticism) / 2);
  
  return (conscientiousness + extraversion + agreeableness + stability) / 4 - opennessDiff * 0.5;
}
```

Use this score to rank candidates before generating match reasons — generate reasons only for the top candidates to reduce API cost.

---

## Match Card Rendering

Each match card must display:
- Avatar emoji (rotated from `EMOJIS` array — never repeats within view)
- Name (or "Anonymous" if `anonymous_mode = true`)
- Role/tagline
- Match level badge (correct color class)
- Current focus (if exists) — labelled "Currently"
- Match reason in quotes
- Trust Signal bars (calculated from matched profile)
- Vibe tags (max 3)
- Connect button — sets `currentRecipientId` and `currentMatchData` before opening message

**Data attributes on each card:**
```html
data-level="chem|connect|vibe"
data-uid="[matched_user_id]"
data-mid="[match_id]"
```

These are used by:
- Filter buttons (filter by level)
- Dismiss animation (find card by uid)
- Resonance logging

---

## Dismiss Flow

1. User clicks "Not for me" / pass button in match detail
2. `recordMiss(reason)` called with the selected reason
3. PATCH match to `status = 'dismissed'`
4. Animate card out: opacity 0, translateX(-20px), then remove from DOM
5. Log to `resonance_log` with event_type = 'pass'

Never remove dismissed matches from the DB — they inform future candidate exclusion.

---

## What Never To Change

- The three match type names: `vibe`, `connection`, `chemistry`
- The match level color assignments — these are part of the Trust Signal visual language
- The mutual matching logic — when A matches B, B always gets A in their finds
- The 5-candidate-per-call limit — protects API costs and response time
