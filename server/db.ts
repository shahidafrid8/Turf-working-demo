import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon, Pool } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

const databaseUrl = process.env.DATABASE_URL;

// DATABASE_URL is optional for local development.
// When not provided, the server runs with in-memory storage.
export const sql = databaseUrl ? neon(databaseUrl) : null;
export const db = sql ? drizzle(sql, { schema }) : null;
export const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
