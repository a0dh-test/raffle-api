import { createProvider } from "difunkt";
import { eq } from "drizzle-orm";
import type { TicketRepository } from "../domain/ports";
import { Database } from "./db/database";
import { tickets } from "./db/schema";

export const DrizzleTicketRepository = createProvider(({ inject }): TicketRepository => {
  const db = inject(Database);

  return {
    findByRaffle: (raffleId) => db.select().from(tickets).where(eq(tickets.raffleId, raffleId)).all(),
    createMany(rows) {
      if (rows.length === 0) return;
      db.insert(tickets).values(rows).run();
    },
  };
});
