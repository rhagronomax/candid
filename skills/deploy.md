# Candid Deploy Skill
`skills/deploy.md` — Read before making any changes that will go to production.

---

## Repository Structure

```
candid/                          ← repo root
  candid/                        ← app folder
    public/
      index.html                 ← entire frontend (HTML + CSS + JS in one file)
    netlify/
      functions/
        claude-proxy.mjs         ← Anthropic API proxy
        matches.mjs              ← match generation, loading, dismissal
        messages.mjs             ← message sending and loading
        notify.mjs               ← email notifications via Resend
    netlify.toml                 ← Netlify configuration
  CLAUDE.md                      ← this project's constitution (repo root)
  skills/                        ← skill files (repo root)
  supabase-migration.sql         ← reference SQL (not auto-run)
```

**Netlify deploys from:** `candid/public/` (publish directory)
**Functions directory:** `candid/netlify/functions/`

---

## Environment Variables (Netlify)

| Key | Value | Used In |
|-----|-------|---------|
| `SUPABASE_URL` | `https://sttkixdqnetxkritldzh.supabase.co` | All functions |
| `SUPABASE_SERVICE_KEY` | JWT service role key | All functions (bypasses RLS) |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | `claude-proxy.mjs`, `matches.mjs` |
| `RESEND_API_KEY` | `re_...` (optional) | `notify.mjs` |

**CRITICAL:** Service key is a JWT starting with `eyJ` — NOT the `sb_secret_` format. The `sb_secret_` key does NOT work with the REST API headers.

Set at: app.netlify.com/projects/b-candid → Site configuration → Environment variables

After changing env vars: always trigger a manual redeploy so functions pick up the new values.

---

## Deploy Process

### Standard deploy
```bash
cd ~/Desktop/candid
git add -A
git commit -m "description of what changed and why"
git push
```

Netlify auto-deploys on push to `main`. Check status at:
`app.netlify.com/projects/b-candid → Deploys`

### Verify before pushing
```bash
# These should all return 1 (defined exactly once)
grep -c "function myUserId" ~/Desktop/candid/candid/public/index.html
grep -c "let conversations" ~/Desktop/candid/candid/public/index.html
grep -c "function loadMessages" ~/Desktop/candid/candid/public/index.html
grep -c "function sendMessage" ~/Desktop/candid/candid/public/index.html
grep -c "function startOnboarding" ~/Desktop/candid/public/index.html
grep -c "function skipToApp" ~/Desktop/candid/candid/public/index.html
```

If any return > 1: find and remove the duplicate before pushing.

### After deploy
1. Wait for Netlify to show green
2. Open b-candid.netlify.app in an incognito window
3. Check browser console for JS errors (Cmd+Option+J)
4. Test the specific thing you changed

---

## Supabase Changes

Schema changes are NOT auto-applied. Run SQL manually in:
`supabase.com/dashboard/project/sttkixdqnetxkritldzh → SQL Editor`

**Before running any migration:**
- Back up affected tables: `SELECT * FROM [table] LIMIT 100`
- Test on a single row if possible
- Run statements one at a time if they might conflict

**RLS principle:** Every new table needs RLS enabled + policies before it's safe.

```sql
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users read own" ON new_table
  FOR SELECT USING (auth.uid() = user_id);

-- Users can write their own data  
CREATE POLICY "Users write own" ON new_table
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## Patching the Frontend

**The right way:** Edit the file in `~/Desktop/candid/candid/public/index.html` directly on the Mac.

**Never do:**
- Download from Claude outputs and manually copy-paste — files get out of sync
- Use `cat > file << 'EOF'` heredocs for large files — special characters break
- Apply multiple patches in sequence without verifying each one lands

**The Python patch approach** (when editing via Claude):
```python
dst = "/Users/rachelmann/Desktop/candid/candid/public/index.html"
with open(dst, 'r') as f:
    content = f.read()

# Always check match count before replacing
count = content.count(old_string)
print(f"Matches: {count}")  # must be 1

content = content.replace(old_string, new_string)
with open(dst, 'w') as f:
    f.write(content)
print("Done")
```

If count is 0: the file has drifted — the string to replace isn't there. Don't proceed blind.
If count > 1: there's a duplicate. Fix the duplicate first.

---

## Function Logs

Check function execution logs at:
`app.netlify.com/projects/b-candid → Logs → Functions`

Select the function (`matches`, `messages`, `claude-proxy`, `notify`) and date range.

**Common errors and fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Host not in allowlist` | Wrong Supabase URL format | Check `SUPABASE_URL` env var |
| `JWT expired` | Service key is the `sb_secret_` format | Replace with JWT format key |
| `Bucket not found` | Wrong bucket name | Bucket is `avatar` (no s, lowercase) |
| `Column not found` | Schema out of sync | Run the migration SQL |
| `Permission denied` | RLS blocking | Check policies for the table |

---

## Rollback

If a deploy breaks the site:
```bash
cd ~/Desktop/candid
git log --oneline -5          # find the last working commit
git revert HEAD               # revert the last commit
git push                      # deploy the revert
```

Or via Netlify UI: Deploys → find the last working deploy → "Publish deploy"

---

## What Never To Deploy Without Testing

- Changes to `supaUpsertProfile` or `saveProfile` — always test saving a profile field
- Changes to `loadMessages` or `sendMessage` — always test sending a message and refreshing
- Changes to auth flow (`doSignIn`, `init`, `launchApp`) — always test sign in and sign out
- Changes to match card rendering — always verify cards load and Connect button works
- Any new Supabase table — always verify RLS policies are in place first
