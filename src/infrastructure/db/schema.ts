import { sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    balance: real("balance").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (t) => [check("users_balance_non_negative", sql`${t.balance} >= 0`)],
);

export const raffles = sqliteTable(
  "raffles",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    prizeId: text("prize_id").notNull(),
    prizeName: text("prize_name").notNull(),
    prizeDescription: text("prize_description").notNull(),
    prizeValue: real("prize_value").notNull(),
    prizeImageUrl: text("prize_image_url"),
    ticketPrice: real("ticket_price").notNull(),
    maxTickets: integer("max_tickets").notNull(),
    ticketsSold: integer("tickets_sold").notNull().default(0),
    drawDate: timestamp("draw_date").notNull(),
    status: text("status", { enum: ["draft", "active", "drawn", "cancelled"] }).notNull(),
    winnerId: text("winner_id").references(() => users.id),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (t) => [check("raffles_tickets_sold_within_max", sql`${t.ticketsSold} <= ${t.maxTickets}`)],
);

export const tickets = sqliteTable(
  "tickets",
  {
    id: text("id").primaryKey(),
    raffleId: text("raffle_id")
      .notNull()
      .references(() => raffles.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    purchasedAt: timestamp("purchased_at").notNull(),
  },
  (t) => [index("tickets_raffle_id_idx").on(t.raffleId)],
);
