# Candid Trust Signal Skill
`skills/trust-signal.md` — Read before touching the Trust Signal calculation, display, or any of the three dimensions.

---

## What the Trust Signal Is

The Trust Signal is Candid's proprietary trust indicator. It is not a score. It is not a rating. It is a visual representation of three dimensions of authentic self-expression, grounded in the Trust Ecology Framework (TEF).

**It answers one question:** Has this person shown up authentically enough for genuine connection to be possible?

The Trust Signal appears in two places:
1. On match cards — showing the matched person's signal
2. On the You tab — showing the current user's own signal with live preview

---

## The Three Dimensions

### Legibility (L) — Green `#00FFB2`
*How clearly and specifically this person expresses who they are.*

Legibility is lit when the profile contains enough specific, non-generic information for another person to understand who they actually are.

**Calculation:**
```javascript
let leg = 0;
if (profile.tagline && profile.tagline.length > 15) leg++;        // has a real tagline
if (profile.achievement && profile.achievement.length > 20) leg++; // has a real achievement
if (profile.open_to && profile.open_to.length > 5) leg++;          // has expressed openness
// Legibility lights when leg >= 2
const legibilityLit = leg >= 2;
```

**What improves Legibility:**
- A specific tagline (not "I work in tech")
- A concrete achievement (not "delivered results")
- A clear expression of what they're open to

### Suspension (S) — Blue `#00ccff`
*The capacity to hold complexity — are they presenting a multi-dimensional self?*

Suspension is lit when the profile signals that this person is more than one thing — they have texture, they're not performing a single role.

**Calculation:**
```javascript
let sus = 0;
if (!profile.anonymous_mode) sus++;                          // not hiding
if ((profile.vibe_tags || []).length >= 2) sus++;            // has multiple dimensions
if (profile.open_to && profile.open_to.length > 5) sus++;   // open to range
// Suspension lights when sus >= 2
const suspensionLit = sus >= 2;
```

**What improves Suspension:**
- Not being in anonymous mode
- Having 2+ vibe tags selected
- Expressing openness beyond one specific thing

### Resonance (R) — Pink `#ff3cac`
*Has this person actually engaged? Have they moved from potential to action?*

Resonance is the only dimension that cannot be gamed upfront — it requires actual behavior. It is lit only when the user has sent their first message.

**Calculation:**
```javascript
const resonanceLit = !!profile.has_messaged;
```

**What improves Resonance:**
- Sending the first message to any match
- `has_messaged` is set to `true` in the profile on first successful message send
- Once lit, stays lit permanently

---

## Display

### On Match Cards
```javascript
function renderTrustSignal(profile) {
  const { legibilityLit, suspensionLit, resonanceLit } = calcTrustSignal(profile);
  return `<div class="trust-signal">
    <span class="ts-label">Trust signal</span>
    <div class="ts-bars">
      <div class="ts-bar ${legibilityLit ? 'lit-legibility' : ''}" title="Legibility"></div>
      <div class="ts-bar ${suspensionLit ? 'lit-suspension' : ''}" title="Suspension"></div>
      <div class="ts-bar ${resonanceLit ? 'lit-resonance' : ''}" title="Resonance"></div>
    </div>
    <span style="font-size:0.6rem;color:var(--muted);margin-left:0.25rem;">
      ${[legibilityLit?'L':'', suspensionLit?'S':'', resonanceLit?'R':''].filter(Boolean).join('·') || '—'}
    </span>
  </div>`;
}
```

### On You Tab (Live Preview)
The You tab shows the user's own Trust Signal with a hint explaining what to improve:

```javascript
function previewTrustSignal() {
  // Read from current edit field values — live as user types
  const profile = {
    tagline: document.getElementById('edit-tagline')?.value || '',
    achievement: document.getElementById('edit-achievement')?.value || '',
    open_to: document.getElementById('edit-open-to')?.value || '',
    anonymous_mode: document.getElementById('you-anon-toggle')?.classList.contains('off'),
    vibe_tags: selectedVibes || [],
    has_messaged: true // assume true for own preview
  };
  const { legibilityLit, suspensionLit, resonanceLit } = calcTrustSignal(profile);
  
  // Update bar elements
  setBar('ts-you-legibility', legibilityLit ? 'lit-legibility' : '');
  setBar('ts-you-suspension', suspensionLit ? 'lit-suspension' : '');
  setBar('ts-you-resonance', resonanceLit ? 'lit-resonance' : '');
  
  // Update hint
  const hint = document.getElementById('ts-you-hint');
  if (hint) hint.textContent = !legibilityLit
    ? 'Add a specific tagline and achievement to improve Legibility.'
    : !suspensionLit
    ? 'Add vibes and consider turning off anonymous mode to improve Suspension.'
    : 'Your Trust Signal is strong.';
}
```

---

## Future Dimensions (Phase 2+)

When facets and personality are fully built, the Trust Signal expands:

**Facet Clarity** — are facets distinct and specific, or generic and overlapping?
**Temporal Honesty** — is the Current Chapter up to date? (flag if not updated in 60+ days)
**Mutual Resonance** — a per-relationship resonance score showing depth of specific connection

These remain hidden until the data infrastructure exists to calculate them reliably.

---

## What Never To Change

- The three dimension names: Legibility, Suspension, Resonance — these are from the TEF and academically grounded
- The order: always L, S, R — left to right
- The color assignments: L=green, S=blue, R=pink — these are the Candid trust color language
- The Resonance threshold: always tied to `has_messaged` — it must require actual behavior, not just profile completion
- The bar-based visual metaphor — do not replace with a score, percentage, or star rating
