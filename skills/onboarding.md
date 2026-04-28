# Candid Onboarding Skill
`skills/onboarding.md` — Read before touching the onboarding flow, AI conversation, or facet extraction.

---

## Purpose

The onboarding conversation is Candid's most important moment. It is the first and only time a user is asked to be genuinely honest about who they are. Everything downstream — their identity, their facets, their matches, their Trust Signal — flows from this conversation.

**The goal is not to collect data. It is to create a moment of authentic self-expression that feels like relief, not a form.**

---

## Flow Architecture

### Step 1 — Intent
User selects what they're here for:
- Professional (work, collaboration, advisory)
- Personal (friendship, community, connection)
- Both (the full self)

This sets `match_mode` on the profile. It also primes the AI conversation — the questions are the same but the framing shifts slightly based on mode.

### Step 2 — The Conversation
Three questions, delivered by the AI one at a time. The AI listens, probes if answers are vague, and extracts signal.

**The three questions (never change these):**
1. "What are you working on right now that actually matters to you — not your job title, the real thing?"
2. "What's something you figured out or built that you're quietly proud of — doesn't have to be impressive to anyone else?"
3. "What kind of person or opportunity would make you drop everything to respond?"

**Name collection:** Before the conversation starts, collect the user's first name. Use it in the greeting: "Hey [name] —" This makes the conversation feel personal from the first word.

### Step 3 — Vibe Tags
User selects up to 3 vibe tags that describe how they show up:
`Direct` `Deep thinker` `Builder` `Curious` `Ambitious` `Grounded` `Warm` `Restless` `Creative` `Analytical` `Empathetic` `Global` `Unconventional` `Calm` `Driven`

These feed the Trust Signal (Suspension dimension) and matching algorithm.

### Step 4 — Account Creation
Email + password. Minimum 8 characters. Show/hide toggle on password field.

---

## AI Conversation Rules

### Vagueness Detection
If an answer is vague, probe once (maximum twice total per question). Vague signals:
- Under 8 words
- Starts with "I work in" / "I am in" / "lots of" / "it depends"
- No specific nouns (no product, project, company, person, or outcome named)

**Probe principle:** Ask for ONE specific thing. Never multiple questions at once.

Good probe: "What exactly are you building — can you name the specific thing?"
Bad probe: "Can you tell me more about what you do and why it matters and what you hope to achieve?"

### Transition Messages
Between questions, use brief acknowledgments:
- After Q1 → "Got it."
- After Q2 → "Good."
- After Q3 → "That's helpful."

Never effusive. Never "Wow, that's amazing!" Never therapeutic.

### Summary Generation
After all three answers, extract a structured profile:

```javascript
// Claude prompt for summary extraction
const prompt = `
Name: ${name}
Q1 (working on): ${answers[0]}
Q2 (built/solved): ${answers[1]}
Q3 (open to): ${answers[2]}

Return ONLY a JSON object, no markdown, no preamble:
{
  "tagline": "One sharp line — what they want to be found for. Under 12 words. Specific.",
  "current_focus": "What they're actively working on right now. One sentence.",
  "achievement": "The thing they built or solved. Specific, evidence-based.",
  "open_to": "What kind of person or opportunity they're looking for.",
  "summary": "A 2-3 sentence narrative of who this person is. Written in second person — 'You are...' Warm but not sycophantic."
}
`;
```

### Facet Extraction (Phase 2)
When facets are built, add to the summary prompt:

```javascript
"facets": [
  {
    "name": "User-chosen name for this dimension (e.g. Builder, Researcher, Human)",
    "description": "One sentence capturing this facet. Written in first person.",
    "suggested": true
  }
]
// Generate 2-3 facets maximum. Each should be distinct. 
// At least one should be professional, one personal if answers support it.
```

---

## Big Five Inference (Phase 2)

After the conversation, infer OCEAN scores from the answers. Never ask about personality directly.

```javascript
// Claude prompt for personality inference
const personalityPrompt = `
Based on these answers, infer Big Five personality scores (0.0 to 1.0):

Q1: ${answers[0]}
Q2: ${answers[1]}
Q3: ${answers[2]}
Vibe tags: ${selectedVibes.join(', ')}

Return ONLY JSON, no markdown:
{
  "openness": 0.0,          // curiosity, creativity, comfort with ambiguity
  "conscientiousness": 0.0, // discipline, follow-through, structure
  "extraversion": 0.0,      // energy direction, social appetite
  "agreeableness": 0.0,     // warmth, cooperation, trust propensity
  "neuroticism": 0.0        // emotional reactivity, stress response (lower = more stable)
}

Base scores on:
- Openness: use of abstract language, breadth of interests, comfort with uncertainty
- Conscientiousness: specificity of achievements, mention of systems/processes
- Extraversion: social language, mention of teams/people vs solo work
- Agreeableness: warmth in language, mention of helping/supporting others
- Neuroticism: hedging language, mention of anxiety/pressure vs confidence
`;
```

Store in `personality_profiles` table. Never expose to users.

---

## What Never To Change

- The three questions — they are calibrated for depth and specificity
- The probe limit (max 2 per question) — more feels interrogative
- The JSON extraction format — downstream functions depend on these exact keys
- The name-first approach — "Hey [name] —" before anything else
