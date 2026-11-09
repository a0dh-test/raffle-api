import { createProvider } from "difunkt";
import { and, eq, sql } from "drizzle-orm";
import type { RaffleRepository } from "../domain/ports";
import type { IRaffle } from "../domain/types";
import { Database } from "./db/database";
import { raffles } from "./db/schema";

type Row = typeof raffles.$inferSelect;

function toRaffle(row: Row): IRaffle {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    prize: {
      id: row.prizeId,
      name: row.prizeName,
      description: row.prizeDescription,
      value: row.prizeValue,
      imageUrl: row.prizeImageUrl,
    },
    ticketPrice: row.ticketPrice,
    maxTickets: row.maxTickets,
    ticketsSold: row.ticketsSold,
    drawDate: row.drawDate,
    status: row.status,
    winnerId: row.winnerId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const DrizzleRaffleRepository = createProvider(({ inject }): RaffleRepository => {
  const db = inject(Database);
  // The draw reads due raffles outside this transaction, so settling one another runner already settled
  // throws: the transaction rolls back and the draw reports it as failed instead of a second winner.
  const settle = (id: string, values: Pick<Row, "status" | "winnerId" | "updatedAt">): void => {
    const settled = db
      .update(raffles)
      .set(values)
      .where(and(eq(raffles.id, id), eq(raffles.status, "active")))
      .returning({ id: raffles.id })
      .all();
    if (settled.length === 0) throw new Error(`raffle ${id} is not active`);
  };

  return {
    findActive: () => db.select().from(raffles).where(eq(raffles.status, "active")).all().map(toRaffle),
    findById(id) {
      const row = db.select().from(raffles).where(eq(raffles.id, id)).get();
      return row ? toRaffle(row) : null;
    },
    sell(id, quantity, now) {
      db.update(raffles)
        .set({ ticketsSold: sql`${raffles.ticketsSold} + ${quantity}`, updatedAt: now })
        .where(eq(raffles.id, id))
        .run();
    },
    markDrawn(id, winnerId, now) {
      return settle(id, { status: "drawn", winnerId, updatedAt: now });
    },
    markCancelled(id, now) {
      return settle(id, { status: "cancelled", winnerId: null, updatedAt: now });
    },
  };
});
