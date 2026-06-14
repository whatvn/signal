import Database from 'better-sqlite3';

const url = (process.env.DATABASE_URL ?? 'file:./claw.db').replace(/^file:/, '');
const db = new Database(url);

db.exec(`
  CREATE TABLE IF NOT EXISTS pipeline_state (
    keyword TEXT PRIMARY KEY NOT NULL,
    last_completed_at INTEGER NOT NULL
  );
`);

db.close();
console.log('Patches applied');
