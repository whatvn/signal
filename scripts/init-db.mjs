import Database from 'better-sqlite3';

const url = (process.env.DATABASE_URL ?? 'file:./claw.db').replace(/^file:/, '');
const db = new Database(url);

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    source_url TEXT,
    author_handle TEXT,
    content_text TEXT NOT NULL,
    raw_json TEXT NOT NULL,
    fetched_at INTEGER NOT NULL,
    published_at INTEGER,
    keyword TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES posts(id),
    author_handle TEXT,
    content_text TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS classifications (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL UNIQUE REFERENCES posts(id),
    sentiment TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    confidence REAL NOT NULL,
    comment_count INTEGER NOT NULL DEFAULT 0,
    classified_at INTEGER NOT NULL,
    model_used TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    rule_name TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    count INTEGER NOT NULL,
    window_minutes INTEGER NOT NULL,
    threshold INTEGER NOT NULL,
    fired_at INTEGER NOT NULL,
    acknowledged_at INTEGER,
    sample_post_ids TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pipeline_state (
    keyword TEXT PRIMARY KEY NOT NULL,
    last_completed_at INTEGER NOT NULL
  );
`);

db.close();
console.log('Database initialized');
