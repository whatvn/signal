import Database from "better-sqlite3";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") ?? "./claw.db";
const OUT_DIR = process.argv[2] ?? "./export";

const db = new Database(DB_PATH, { readonly: true });
db.pragma("journal_mode = WAL");

mkdirSync(OUT_DIR, { recursive: true });

const TABLES = ["posts", "comments", "classifications", "alerts"];

function toCSV(rows) {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c])).join(","))].join("\n");
}

for (const table of TABLES) {
  const rows = db.prepare(`SELECT * FROM ${table}`).all();
  writeFileSync(join(OUT_DIR, `${table}.json`), JSON.stringify(rows, null, 2));
  writeFileSync(join(OUT_DIR, `${table}.csv`), toCSV(rows));
  console.log(`${table}: ${rows.length} rows`);
}

console.log(`\nExported to ${OUT_DIR}/`);
