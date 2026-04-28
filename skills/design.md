# Candid Design System
`skills/design.md` — Read before touching any CSS, layout, or visual element.

---

## Design Philosophy

Candid's aesthetic is **dark, minimal, and intentional**. Every visual decision should communicate trust, depth, and authenticity. The product should feel premium without being cold — like a candid conversation in a quiet room, not a nightclub or a corporate lobby.

**Three words that define the aesthetic:** Honest. Considered. Alive.

**What to avoid:** Generic SaaS purple gradients. Playful rounded bubbles. Aggressive CTAs. Anything that feels like it's trying too hard.

---

## Color Tokens

```css
/* Backgrounds */
--bg: #0a0a0a;           /* page background — near black */
--warm: #111111;         /* card/surface — slightly warmer */
--sand: #1a1a1a;         /* elevated surface, inputs */

/* Text */
--white: #f0f0f0;        /* primary text */
--muted: #888888;        /* secondary text, labels */
--ink: #000000;          /* pure black — for light-bg contexts */

/* Borders */
--line: rgba(255,255,255,0.08);  /* standard border */

/* Match Levels — the trust hierarchy */
--vibe: #00FFB2;         /* Vibe — entry level, mint green */
--connect: #00ccff;      /* Connection — mid level, electric blue */
--chem: #ff3cac;         /* Chemistry — highest, hot pink */

/* Trust Signal bars */
--legibility-color: #00FFB2;    /* same as vibe */
--suspension-color: #00ccff;    /* same as connect */
--resonance-color: #ff3cac;     /* same as chem */
```

**Usage rules:**
- `--vibe` is the primary action color — buttons, active states, highlights
- `--chem` is used sparingly — only for Chemistry matches and Resonance
- Never use white text on `--vibe` background (low contrast) — use `--ink` instead
- Cards always use `--warm` background, never `--bg`

---

## Typography

```css
/* Import */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,700;1,9..144,400;1,9..144,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

/* Scale */
--font-serif: 'Fraunces', Georgia, serif;
--font-sans: 'DM Sans', sans-serif;
```

**Type scale:**
| Role | Font | Size | Weight |
|------|------|------|--------|
| Hero/splash headline | Fraunces | 2.8-3.5rem | 700 |
| Section heading | Fraunces | 1.4-1.8rem | 400 italic |
| Card name | DM Sans | 0.88-1rem | 600 |
| Body text | DM Sans | 0.88rem | 300-400 |
| Labels/caps | DM Sans | 0.68-0.72rem | 600, letter-spacing: 0.08em |
| Match reason | DM Sans | 0.82rem | 300 italic |

**Rules:**
- Fraunces for all display text, headings, and the Candid wordmark
- DM Sans for all UI, body copy, and data
- Never use italic on small text under 0.8rem
- Letter-spacing on caps labels: always 0.06-0.1em

---

## Spacing System

```css
/* Base unit: 4px */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

**Layout:**
- Max content width: 480px (mobile-first, single column)
- Horizontal padding: 1.5rem (24px) on all screens
- Card padding: 1.25rem 1.5rem (20px 24px)
- Section gaps: 1.5rem between major sections
- Bottom nav height: 72px + safe area

---

## Core Components

### Cards (Match Cards)
```css
.match-card {
  background: var(--warm);
  border: 1px solid var(--line);
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.match-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
```

**Match level indicators:**
```css
.ml-vibe    { background: rgba(0,255,178,0.1); color: #00FFB2; }
.ml-connect { background: rgba(0,204,255,0.1); color: #00ccff; }
.ml-chem    { background: rgba(255,60,172,0.1); color: #ff3cac; }
```

### Trust Signal
Three horizontal bars, each representing one dimension:
```css
.ts-bar {
  height: 4px;
  border-radius: 2px;
  background: var(--line);
  flex: 1;
  transition: background 0.3s;
}

.lit-legibility { background: var(--vibe); }
.lit-suspension { background: var(--connect); }
.lit-resonance  { background: var(--chem); }
```

Always render all three bars — unlit bars show as `--line` color (dim).

### Buttons
```css
/* Primary */
.btn-primary {
  background: var(--vibe);
  color: var(--ink);
  border: none;
  border-radius: 100px;
  padding: 0.85rem 1.5rem;
  font-family: var(--font-sans);
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
}

/* Secondary */
.btn-secondary {
  background: none;
  color: var(--white);
  border: 1px solid var(--line);
  border-radius: 100px;
  padding: 0.75rem 1.25rem;
}

/* Ghost (for destructive/pass actions) */
.btn-ghost {
  background: none;
  color: var(--muted);
  border: none;
  font-size: 0.82rem;
}
```

### Inputs
```css
.field-input {
  width: 100%;
  background: var(--sand);
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--white);
  padding: 0.85rem 1rem;
  font-family: var(--font-sans);
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.2s;
}

.field-input:focus {
  border-color: rgba(0,255,178,0.4);
}

.field-input::placeholder { color: var(--muted); }
```

### Bottom Navigation
```css
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: rgba(10,10,10,0.95);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--line);
  display: flex;
  padding: 0.75rem 0 max(1rem, env(safe-area-inset-bottom));
  z-index: 100;
}
```

**Three tabs only:** Finds, Messages, You. Never add more tabs.

### Toast Notifications
```css
.toast {
  background: var(--warm);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.85rem 1.1rem;
  font-size: 0.82rem;
  color: var(--white);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}

.toast.success { border-color: rgba(0,255,178,0.3); }
.toast.error   { border-color: rgba(255,60,172,0.3); }
.toast.info    { border-color: rgba(0,204,255,0.3); }
```

---

## Animation Principles

**Core animations:**
```css
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

**Rules:**
- Cards slide up on load with staggered `animation-delay` (0.1s per card)
- Loading states use `pulse` animation on dots
- Skeleton loaders use `shimmer`
- Screen transitions: 0.25s ease
- Never animate layout properties — only transform and opacity
- Respect `prefers-reduced-motion`

---

## Screen Architecture

**Screens (each is a div with class `screen`, only one `active` at a time):**
- `splash` — landing, not logged in
- `onboarding` — 4-step signup flow
- `screen-signin` — sign in form
- `app` — finds/matches (main screen)
- `match-detail` — single match detail view
- `screen-messages` — conversation list
- `msg-overlay` — full-screen chat (slides in from right)
- `screen-you` — profile/identity tab

**Screen transition:**
```css
.screen { display: none; }
.screen.active { display: flex; flex-direction: column; }
```

---

## Mobile-First Rules

- Design for 375px width minimum
- All touch targets minimum 44px × 44px
- Safe area: `max(1rem, env(safe-area-inset-bottom))` on bottom nav and message sheet
- Keyboard: message input must scroll into view when keyboard opens
- No hover-only interactions — everything must work on touch

---

## Voice and Tone

**Candid speaks like a thoughtful person, not a product.**

- Short sentences. Never corporate.
- Uses "you" directly — never "users" or "members"
- Honest about what it is and isn't — never oversells
- Warm without being sycophantic
- Labels are descriptive, not instructional ("What I want to be found for" not "Enter your tagline")

**Examples:**
- ✅ "Finding your people…"
- ✅ "Keep it real — no pitches."
- ✅ "No finds yet. Check back soon."
- ❌ "Loading your personalized matches!"
- ❌ "Connect with professionals in your network!"
- ❌ "Complete your profile to get started."

---

## What Never To Change

- The three-color match hierarchy (vibe/connect/chem)
- The Trust Signal bar order (Legibility, Suspension, Resonance — always L, S, R)
- The Fraunces + DM Sans pairing
- The dark background (`--bg: #0a0a0a`) — Candid is always dark mode
- The bottom nav three-tab structure
