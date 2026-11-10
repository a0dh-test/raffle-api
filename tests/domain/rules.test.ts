import { describe, expect, test } from "bun:test";
import {
  InsufficientBalance,
  InvalidQuantity,
  NotEnoughTickets,
  RaffleClosed,
  RaffleNotActive,
} from "../../src/domain/errors";
import { assertCanAfford, assertPurchasable, isDue, isOpen, ticketsRemaining } from "../../src/domain/rules";
import type { IRaffle, RaffleStatus } from "../../src/domain/types";

const now = new Date("2026-01-01T12:00:00Z");
const future = new Date("2026-01-02T12:00:00Z");
const past = new Date("2025-12-31T12:00:00Z");

function raffle(overrides: Partial<IRaffle> = {}): IRaffle {
  return {
    id: "raffle-x",
    name: "Raffle",
    description: "A raffle",
    prize: { id: "prize-x", name: "Prize", description: "A prize", value: 100, imageUrl: null },
    ticketPrice: 5,
    maxTickets: 10,
    ticketsSold: 0,
    drawDate: future,
    status: "active",
    winnerId: null,
    createdAt: past,
    updatedAt: past,
    ...overrides,
  };
}

describe("raffle rules", () => {
  test.each<RaffleStatus>(["draft", "drawn", "cancelled"])("rejects a purchase on a %s raffle", (status) => {
    expect(() => assertPurchasable(raffle({ status }), 1, now)).toThrow(RaffleNotActive);
  });

  test("rejects a purchase on an active raffle whose draw date has been reached", () => {
    expect(() => assertPurchasable(raffle({ drawDate: now }), 1, now)).toThrow(RaffleClosed);
    expect(() => assertPurchasable(raffle({ drawDate: past }), 1, now)).toThrow(RaffleClosed);
  });

  test("treats a raffle as open until its draw date", () => {
    expect(isOpen(raffle({ drawDate: now }), now)).toBe(false);
    expect(isOpen(raffle({ drawDate: past }), now)).toBe(false);
    expect(isOpen(raffle({ drawDate: new Date(now.getTime() + 1) }), now)).toBe(true);
  });

  test("allows buying up to the tickets remaining and no more", () => {
    const r = raffle({ maxTickets: 10, ticketsSold: 8 });
    expect(ticketsRemaining(r)).toBe(2);
    expect(() => assertPurchasable(r, 3, now)).toThrow(NotEnoughTickets);
    expect(() => assertPurchasable(r, 2, now)).not.toThrow();
  });

  test.each([0, -2, 1.5])("rejects a quantity of %p before any other check", (quantity) => {
    expect(() => assertPurchasable(raffle(), quantity, now)).toThrow(InvalidQuantity);
    expect(() => assertPurchasable(raffle({ status: "draft" }), quantity, now)).toThrow(InvalidQuantity);
  });

  test("allows a purchase that exactly matches the balance and rejects one above it", () => {
    expect(() => assertCanAfford(25, 25)).not.toThrow();
    expect(() => assertCanAfford(25, 30)).toThrow(InsufficientBalance);
  });

  test.each([
    { name: "active and past due", r: raffle({ drawDate: past }), due: true },
    { name: "active and in the future", r: raffle({ drawDate: future }), due: false },
    { name: "drawn and past due", r: raffle({ status: "drawn", drawDate: past }), due: false },
  ])("decides whether a raffle is due: $name", ({ r, due }) => {
    expect(isDue(r, now)).toBe(due);
  });
});
