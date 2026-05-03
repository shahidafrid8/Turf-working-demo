import "dotenv/config";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to back up the database");
}

const backupDir = path.resolve(process.cwd(), "backups");
fs.mkdirSync(backupDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputFile = path.join(backupDir, `quickturf-${timestamp}.dump`);
const pgDump = spawn("pg_dump", ["--format=custom", "--no-owner", "--file", outputFile], {
  env: { ...process.env, PGDATABASE: databaseUrl },
  stdio: "inherit",
});

pgDump.on("exit", (code) => {
  if (code === 0) {
    console.log(`Database backup written to ${outputFile}`);
  } else {
    console.error("Database backup failed. Make sure pg_dump is installed and available in PATH.");
  }
  process.exit(code ?? 1);
});
