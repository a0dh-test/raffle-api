import { describe, expect, test } from "bun:test";
import { PurchaseTickets } from "../../src/application/purchase-tickets";
import {
  InsufficientBalance,
  InvalidQuantity,
  RaffleNotActive,
  RaffleNotFound,
  UserNotFound,
} from "../../src/domain/errors";
import type { IRaffle, IUser } from "../../src/domain/types";
import { useCases } from "../bootstrap";
import {
  fakeRaffleRepository,
  fakeTicketRepository,
  fakeUserRepository,
  fixedClock,
  fixedRandom,
  recordingUnitOfWork,
} from "../fakes";

const T = new Date("2026-01-01T12:00:00Z");
const past = new Date("2025-12-31T12:00:00Z");
const future = new Date("2027-01-01T12:00:00Z");

const user = (id: string, balance: number): IUser => ({
  id,
  email: `${id}@example.com`,
  name: id,
  balance,
  createdAt: past,
});

const raffle = (overrides: Partial<IRaffle> = {}): IRaffle => ({
  id: "raffle-1",
  name: "Raffle",
  description: "A raffle",
  prize: { id: "prize-1", name: "Prize", description: "A prize", value: 100, imageUrl: null },
  ticketPrice: 5,
  maxTickets: 10,
  ticketsSold: 0,
  drawDate: future,
  status: "active",
  winnerId: null,
  createdAt: past,
  updatedAt: past,
  ...overrides,
});

async function setup(raffles: IRaffle[], users: IUser[]) {
  const uow = recordingUnitOfWork();
  const ports = {
    uow,
    raffles: fakeRaffleRepository(uow, raffles),
    tickets: fakeTicketRepository(uow),
    users: fakeUserRepository(uow, users),
    clock: fixedClock(T),
    random: fixedRandom(0),
  };
  const resolve = await useCases(ports);
  return { ...ports, purchase: resolve(PurchaseTickets) };
}

describe("purchase tickets", () => {
  test("resolves the use case with every port overridden through createApplication", async () => {
    const { purchase, uow, raffles, tickets, users } = await setup([raffle()], [user("user-alice", 100)]);

    const result = purchase.execute({ userId: "user-alice", raffleId: "raffle-1", quantity: 3 });

    expect(result.balance).toBe(85);
    expect(result.tickets).toHaveLength(3);
    for (const t of result.tickets) {
      expect(t.raffleId).toBe("raffle-1");
      expect(t.userId).toBe("user-alice");
      expect(t.purchasedAt).toEqual(T);
    }
    expect(tickets.store).toEqual(result.tickets);
    expect(users.store.get("user-alice")?.balance).toBe(85);
    expect(raffles.store.get("raffle-1")?.ticketsSold).toBe(3);
    expect(raffles.store.get("raffle-1")?.updatedAt).toEqual(T);
    expect(uow.calls).toBe(1);
  });

  test.each([
    { name: "an unknown raffle", userId: "user-alice", raffleId: "nope", error: RaffleNotFound },
    { name: "an unknown user", userId: "nope", raffleId: "raffle-1", error: UserNotFound },
  ])("rejects a purchase for $name and writes nothing", async ({ userId, raffleId, error }) => {
    const { purchase, tickets, users } = await setup([raffle()], [user("user-alice", 100)]);

    expect(() => purchase.execute({ userId, raffleId, quantity: 1 })).toThrow(error);

    expect(tickets.store).toEqual([]);
    expect(users.store.get("user-alice")?.balance).toBe(100);
  });

  test.each([
    { name: "a drawn raffle", r: raffle({ status: "drawn" }), balance: 100, quantity: 1, error: RaffleNotActive },
    { name: "a balance that is too low", r: raffle(), balance: 20, quantity: 5, error: InsufficientBalance },
    { name: "a negative quantity", r: raffle(), balance: 100, quantity: -2, error: InvalidQuantity },
  ])("rejects a purchase on $name and writes nothing", async ({ r, balance, quantity, error }) => {
    const { purchase, raffles, tickets, users } = await setup([r], [user("user-bob", balance)]);

    expect(() => purchase.execute({ userId: "user-bob", raffleId: "raffle-1", quantity })).toThrow(error);

    expect(tickets.store).toEqual([]);
    expect(users.store.get("user-bob")?.balance).toBe(balance);
    expect(raffles.store.get("raffle-1")?.ticketsSold).toBe(0);
  });
});
