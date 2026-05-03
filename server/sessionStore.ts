import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { logger } from "./logger";

export function createSessionStore(): session.Store {
  if (process.env.USE_MEMORY_SESSION_STORE === "true" || !pool) {
    logger.warn("session.store.fallback", {
      store: "memory",
      reason: process.env.USE_MEMORY_SESSION_STORE === "true" ? "USE_MEMORY_SESSION_STORE=true" : "DATABASE_URL not configured",
    });
    return new session.MemoryStore();
  }

  const PgSessionStore = connectPgSimple(session);

  logger.info("session.store.enabled", { store: "postgres" });

  return new PgSessionStore({
    pool: pool as any,
    tableName: "session",
    createTableIfMissing: true,
  });
}
