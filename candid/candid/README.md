# Candid

> Be found for who you actually are. Professionally. Personally. Both.

## Stack

- **Frontend**: Vanilla HTML/CSS/JS — single `public/index.html`
- **Backend**: Netlify Serverless Functions (`netlify/functions/`)
- **Database + Auth**: Supabase (Postgres + Row Level Security)
- **AI Matching + Openers**: Claude API (claude-sonnet-4-20250514)

## Setup

### 1. Clone and connect to Netlify

```bash
git init
git add .
git commit -m "Initial commit"
```

Push to GitHub, then connect the repo in Netlify:
**Netlify Dashboard → Add new site → Import from Git**

### 2. Environment variables (already set via Claude)

These are set in your Netlify project:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

You need to add one more manually in **Netlify → Site settings → Environment variables**:
- `ANTHROPIC_API_KEY` — get this from console.anthropic.com

### 3. Supabase schema

Already applied. Tables: `profiles`, `matches`, `connections`, `messages`, `profile_views`.

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth` | Signup / signin |
| GET/POST/PUT | `/api/profile` | Get or save profile |
| GET/POST/DELETE | `/api/matches` | Get matches, generate new, dismiss |
| GET/POST | `/api/connect` | Send / accept connection requests |
| GET/POST | `/api/messages` | Get conversations, send message |
| POST | `/api/opener` | Generate AI conversation opener |

## Local Development

```bash
npm install -g netlify-cli
netlify dev
```
