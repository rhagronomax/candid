-- ══════════════════════════════════════════════
-- Candid — Supabase Migration
-- Run in: supabase.com/dashboard/project/sttkixdqnetxkritldzh → SQL Editor
-- ══════════════════════════════════════════════

-- 1. Add has_messaged flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_messaged BOOLEAN DEFAULT false;

-- 2. Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  body TEXT NOT NULL CHECK (char_length(body) > 0),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Index for fast thread loading
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_recipient_id_idx ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies — users can only see messages they sent or received
CREATE POLICY "Users can read own messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update read status on received messages" ON messages
  FOR UPDATE USING (auth.uid() = recipient_id);

-- 6. RLS on profiles (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Profiles visible to authenticated users" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
