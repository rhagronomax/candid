# Candid Messaging Skill
`skills/messaging.md` — Read before touching the chat UI, message sending, conversation loading, or the messages function.

---

## Messaging Philosophy

Messages on Candid are not notifications. They are the beginning of real connection. Every design decision should protect the quality of that first exchange.

**Key principles:**
- Messages persist across sessions — always load from DB, never rely on in-memory state alone
- The chat thread shows the full history — not just the last message
- Sending a message is a significant act — it should feel intentional, not casual
- No fake replies — if there is no real user behind a profile, the message waits

---

## State Architecture

```javascript
// Global state — declared once at top of script
let conversations = {};       // keyed by partnerId (UUID), not by name
let currentRecipientId = null; // UUID of current chat partner
let currentMatchData = {};     // full match context for current chat
```

**`conversations` object shape:**
```javascript
conversations[partnerId] = {
  name: 'James Okafor',
  role: 'Infrastructure engineer...',
  avatar: '👨‍💼',
  level: 'connect',       // vibe | connect | chem
  id: partnerId,          // UUID
  unread: 0,              // count of unread messages
  messages: [
    { from: 'me', text: '...', time: '2:34 PM' },
    { from: 'James Okafor', text: '...', time: '2:45 PM' }
  ]
};
```

**Critical:** Always key by UUID, never by name. Names can change. UUIDs don't.

---

## The `/api/messages` Function

### POST — Send a message
```javascript
// Required fields
{ recipient_id: UUID, body: string, match_id: UUID|null }

// Returns the created message record
```

### GET — Load threads
```javascript
// Returns all messages involving the user
// Grouped by conversation partner on the client side
```

---

## Loading Messages (`loadMessages`)

Called on login and when switching to the Messages tab. Fetches all messages from Supabase directly (not via the API function — direct Supabase query for speed).

```javascript
async function loadMessages() {
  const myId = myUserId();
  // Fetch all messages involving this user
  const msgs = await supaFetch(
    `messages?or=(sender_id.eq.${myId},recipient_id.eq.${myId})&order=created_at.asc`
  );
  
  // Group by partner
  // Fetch profiles for all partners in one query
  // Rebuild conversations object
  // Call updateMessagesTab()
  // Update unread badge
}
```

**Always call `loadMessages()` on:**
- Login (via `doSignIn`)
- Auto-login (via `init()`)
- Switching to Messages tab

---

## Opening a Chat (`openMsg`)

Called when user clicks Connect on a match card or opens a conversation from the Messages tab.

**Before calling `openMsg()`:**
Always set both:
```javascript
currentRecipientId = matchedUserId;  // UUID
currentMatchData = { name, role, level, avatar, id: matchedUserId, matchId };
```

**`openMsg()` does:**
1. Set chat header (title = partner name, subtitle = partner role)
2. Open the overlay
3. Call `renderThread(currentRecipientId)` to show existing messages
4. If thread is empty, call `loadThreadFromDB(currentRecipientId)` to fetch from DB

---

## Loading a Specific Thread (`loadThreadFromDB`)

When opening a chat, if `conversations[partnerId]` is empty, fetch the full thread:

```javascript
async function loadThreadFromDB(partnerId) {
  const myId = myUserId();
  const msgs = await supaFetch(
    `messages?or=(and(sender_id.eq.${myId},recipient_id.eq.${partnerId}),` +
    `and(sender_id.eq.${partnerId},recipient_id.eq.${myId}))&order=created_at.asc`
  );
  // Map to conversations[partnerId].messages
  // Call renderThread(partnerId)
}
```

---

## Rendering the Thread (`renderThread`)

Always clear existing bubbles before re-rendering. Never append to stale state.

```javascript
function renderThread(partnerId) {
  const thread = document.getElementById('msg-thread');
  thread.querySelectorAll('.msg-bubble').forEach(b => b.remove());
  
  const msgs = conversations[partnerId]?.messages || [];
  if (!msgs.length) { showEmpty(); return; }
  
  msgs.forEach(msg => appendBubble(msg.from === 'me', msg.text, msg.time, false));
  thread.scrollTop = thread.scrollHeight;
}
```

---

## Sending a Message (`sendMessage`)

```javascript
async function sendMessage() {
  const recipientId = currentRecipientId || currentMatchData?.id;
  if (!recipientId) { showToast('No recipient', 'error'); return; }
  
  // 1. POST to /api/messages
  // 2. On success: appendBubble(true, text, time)
  // 3. Update conversations[recipientId].messages
  // 4. Clear input, reset height
  // 5. Update has_messaged on profile (for Resonance)
  // 6. Fire /api/notify (non-blocking)
  // 7. Call updateMessagesTab()
}
```

**On send success:**
- Do NOT close the chat — user stays in the thread
- Do NOT simulate a reply — real users reply in their own time
- Show "Message sent" toast

---

## Chat UI Architecture

The message overlay is a full-screen slide-in (not a bottom sheet):

```css
.msg-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg);
  z-index: 200;
  transform: translateX(100%);
  transition: transform 0.25s ease;
}

.msg-overlay.open { transform: translateX(0); }
```

**Layout (flex column, full height):**
1. **Header** — back button, partner name, partner role
2. **Thread** (`#msg-thread`) — flex: 1, overflow-y: auto, scrolls to bottom on new message
3. **Compose** — textarea + AI button + Send button, fixed at bottom with safe area padding

**Message bubbles:**
- Mine: right-aligned, `--vibe` background, `--ink` text, `border-radius: 16px 16px 4px 16px`
- Theirs: left-aligned, `--warm` background, `--white` text, `border-radius: 16px 16px 16px 4px`

---

## Unread Badge

The Messages nav item has a badge element:
```html
<span id="msg-badge" style="display:none;..."></span>
```

**Update after `loadMessages()`:**
```javascript
const totalUnread = Object.values(conversations).reduce((s, c) => s + (c.unread || 0), 0);
badge.textContent = totalUnread > 0 ? totalUnread : '';
badge.style.display = totalUnread > 0 ? 'inline-block' : 'none';
```

**Clear when opening Messages tab.**

---

## iOS Keyboard Fix

```javascript
document.addEventListener('focusin', (e) => {
  if (e.target.id === 'msg-text') {
    setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
  }
});
```

---

## What Never To Change

- The UUID-keyed `conversations` object — never key by name
- The full-screen overlay approach — the chat is not a modal or bottom sheet
- The no-simulated-replies rule — fake replies break trust and the product philosophy
- The `has_messaged` update on first send — this is the Resonance signal source of truth
- The thread scroll-to-bottom behavior — users expect the latest message to be visible
