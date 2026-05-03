import "dotenv/config";
import { pool } from "../server/db";
import { storage } from "../server/storage";

const runtimeStorage = storage as typeof storage & {
  readyPromise?: Promise<void>;
};

await runtimeStorage.readyPromise;

if (!pool) {
  throw new Error("DATABASE_URL is required to seed the database");
}

console.log("Database seed completed. Empty databases are populated from the local seed set during storage startup.");
await pool.end();
