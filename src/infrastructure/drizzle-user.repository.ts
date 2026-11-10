import { createProvider } from "difunkt";
import { eq, sql } from "drizzle-orm";
import type { UserRepository } from "../domain/ports";
import { Database } from "./db/database";
import { users } from "./db/schema";

export const DrizzleUserRepository = createProvider(({ inject }): UserRepository => {
  const db = inject(Database);

  return {
    findById: (id) => db.select().from(users).where(eq(users.id, id)).get() ?? null,
    debit(id, amount) {
      db.update(users)
        .set({ balance: sql`${users.balance} - ${amount}` })
        .where(eq(users.id, id))
        .run();
    },
  };
});
