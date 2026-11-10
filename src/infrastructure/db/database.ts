import { Database as SQLite } from "bun:sqlite";
import { join } from "node:path";
import { createProvider, createProviderToken } from "difunkt";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";
import { seed } from "./seed";

export const DbPath = createProviderToken<string>("DbPath");

export const Database = createProvider(({ inject }) => {
  const sqlite = new SQLite(inject(DbPath));
  sqlite.run("PRAGMA foreign_keys = ON");
  return drizzle(sqlite, { schema });
});
export type Db = BunSQLiteDatabase<typeof schema> & { $client: SQLite };

const migrationsFolder = join(import.meta.dir, "../../../drizzle");

export function migrateAndSeed(db: Db, now: Date): void {
  migrate(db, { migrationsFolder });
  seed(db, now);
}
