import Database from "better-sqlite3";
import { mkdirSync, existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, resolve } from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DB_PATH = resolve(
  process.env.DATABASE_URL?.replace("file:", "") ?? "./claw.db"
);
const BACKUP_DIR = resolve(process.env.BACKUP_DIR ?? "./backups");

// POST /api/backup — create a hot backup of the live database
export async function POST() {
  try {
    if (!existsSync(DB_PATH)) {
      return NextResponse.json(
        { error: `Database not found at ${DB_PATH}` },
        { status: 404 }
      );
    }

    mkdirSync(BACKUP_DIR, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = join(BACKUP_DIR, `claw-backup-${ts}.db`);

    const src = new Database(DB_PATH, { readonly: true });
    src.pragma("journal_mode = WAL");
    await src.backup(backupFile);
    src.close();

    return NextResponse.json({
      ok: true,
      backup: backupFile,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/backup/download — stream the most recent backup file
export async function GET() {
  try {
    if (!existsSync(BACKUP_DIR)) {
      return NextResponse.json({ error: "No backups found" }, { status: 404 });
    }

    const files = readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("claw-backup-") && f.endsWith(".db"))
      .map((f) => ({ name: f, mtime: statSync(join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      return NextResponse.json({ error: "No backups found" }, { status: 404 });
    }

    const latest = join(BACKUP_DIR, files[0].name);
    const data = readFileSync(latest);

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${files[0].name}"`,
        "Content-Length": String(data.length),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
