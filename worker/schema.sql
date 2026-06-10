CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT NOT NULL REFERENCES users(id),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  avatar_initial TEXT,
  description TEXT DEFAULT '',
  personality TEXT DEFAULT '',
  backstory TEXT DEFAULT '',
  orientation TEXT DEFAULT '',
  custom_orientation TEXT DEFAULT '',
  relationship_modes TEXT DEFAULT '[]',
  custom_relationship TEXT DEFAULT '',
  involved_characters TEXT DEFAULT '[]',
  kinks TEXT DEFAULT '[]',
  pure_love_mode INTEGER DEFAULT 0,
  model_provider TEXT DEFAULT '',
  model_api_key TEXT DEFAULT '',
  model_name TEXT DEFAULT '',
  model_base_url TEXT DEFAULT '',
  voice_id TEXT DEFAULT '',
  tts_enabled INTEGER DEFAULT 0,
  stt_enabled INTEGER DEFAULT 0,
  chat_space_id TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS character_memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  chat_space_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  chat_space_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  session_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  quote TEXT,
  reasoning_content TEXT DEFAULT '',
  reasoning_source TEXT,
  reasoning_visible INTEGER DEFAULT 0,
  response_group_id TEXT,
  status TEXT DEFAULT 'sent',
  read_by_user INTEGER DEFAULT 1,
  read_by_du INTEGER DEFAULT 1,
  excluded_from_context INTEGER DEFAULT 0,
  deleted_at TEXT,
  superseded_at TEXT,
  meta TEXT DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_user_chat ON messages(user_id, chat_space_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_memories_user_space ON character_memories(user_id, chat_space_id);
CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);
