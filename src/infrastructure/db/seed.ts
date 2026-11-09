import { count } from "drizzle-orm";
import type { Db } from "./database";
import { raffles, tickets, users } from "./schema";

const SEED_USERS = [
  { id: "user-alice", email: "alice@example.com", name: "Alice", balance: 100 },
  { id: "user-bob", email: "bob@example.com", name: "Bob", balance: 20 },
  { id: "user-carol", email: "carol@example.com", name: "Carol", balance: 0 },
] as const;

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function raffle(n: number, name: string, prize: { name: string; description: string; value: number }) {
  return {
    id: `raffle-${n}`,
    name,
    description: `Win ${prize.name}`,
    prizeId: `prize-${n}`,
    prizeName: prize.name,
    prizeDescription: prize.description,
    prizeValue: prize.value,
    prizeImageUrl: null,
    ticketPrice: 5,
    maxTickets: 10,
    ticketsSold: 0,
  };
}

// drawDate and the timestamps depend on the boot time, so they are derived from `now`.
export const SEED_RAFFLES = (now: Date) => [
  {
    ...raffle(1, "Weekend Getaway", {
      name: "Weekend Getaway",
      description: "Two nights for two in Lisbon",
      value: 800,
    }),
    status: "active" as const,
    drawDate: new Date(now.getTime() + 365 * DAY),
    createdAt: now,
    updatedAt: now,
  },
  {
    ...raffle(2, "Espresso Machine", {
      name: "Espresso Machine",
      description: "Semi-automatic espresso machine",
      value: 450,
    }),
    ticketPrice: 10,
    maxTickets: 5,
    status: "active" as const,
    drawDate: new Date(now.getTime() + 2 * MINUTE),
    createdAt: now,
    updatedAt: now,
  },
  {
    ...raffle(3, "Noise-Cancelling Headphones", {
      name: "Noise-Cancelling Headphones",
      description: "Over-ear wireless headphones",
      value: 300,
    }),
    ticketsSold: 3,
    status: "active" as const,
    drawDate: new Date(now.getTime() - MINUTE),
    createdAt: new Date(now.getTime() - DAY),
    updatedAt: new Date(now.getTime() - DAY),
  },
  {
    ...raffle(4, "Mountain Bike", { name: "Mountain Bike", description: "Carbon hardtail mountain bike", value: 1500 }),
    status: "draft" as const,
    drawDate: new Date(now.getTime() + 30 * DAY),
    createdAt: now,
    updatedAt: now,
  },
];

export const SEED_TICKETS = (now: Date) =>
  ["user-alice", "user-bob", "user-alice"].map((userId, i) => ({
    id: `ticket-${i + 1}`,
    raffleId: "raffle-3",
    userId,
    purchasedAt: new Date(now.getTime() - DAY + i * MINUTE),
  }));

export function seed(db: Db, now: Date): void {
  db.transaction((tx) => {
    if ((tx.select({ n: count() }).from(users).get()?.n ?? 0) > 0) return;
    tx.insert(users)
      .values(SEED_USERS.map((u) => ({ ...u, createdAt: now })))
      .run();
    tx.insert(raffles).values(SEED_RAFFLES(now)).run();
    tx.insert(tickets).values(SEED_TICKETS(now)).run();
  });
}
