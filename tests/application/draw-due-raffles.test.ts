import { describe, expect, test } from "bun:test";
import { DrawDueRaffles } from "../../src/application/draw-due-raffles";
import type { IRaffle, ITicket } from "../../src/domain/types";
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

const raffle = (id: string, overrides: Partial<IRaffle> = {}): IRaffle => ({
  id,
  name: id,
  description: "A raffle",
  prize: { id: "prize-1", name: "Prize", description: "A prize", value: 100, imageUrl: null },
  ticketPrice: 5,
  maxTickets: 10,
  ticketsSold: 0,
  drawDate: past,
  status: "active",
  winnerId: null,
  createdAt: past,
  updatedAt: past,
  ...overrides,
});

const ticket = (id: string, raffleId: string, userId: string): ITicket => ({
  id,
  raffleId,
  userId,
  purchasedAt: past,
});

async function setup(raffles: IRaffle[], tickets: ITicket[], index = 0, failFor?: string) {
  const uow = recordingUnitOfWork();
  const ticketRepo = fakeTicketRepository(uow, tickets);
  if (failFor) {
    const find = ticketRepo.findByRaffle;
    ticketRepo.findByRaffle = (id) => {
      if (id === failFor) throw new Error("db exploded");
      return find(id);
    };
  }
  const raffleRepo = fakeRaffleRepository(uow, raffles);
  const random = fixedRandom(index);
  const resolve = await useCases({
    uow,
    raffles: raffleRepo,
    tickets: ticketRepo,
    users: fakeUserRepository(uow),
    clock: fixedClock(T),
    random,
  });
  return { uow, random, store: raffleRepo.store, draw: resolve(DrawDueRaffles) };
}

describe("draw due raffles", () => {
  test("draws a random ticket's owner for each due raffle and leaves the others alone", async () => {
    const { draw, random, store } = await setup(
      [raffle("raffle-3", { ticketsSold: 3 }), raffle("raffle-1", { drawDate: future })],
      [
        ticket("t1", "raffle-3", "user-alice"),
        ticket("t2", "raffle-3", "user-bob"),
        ticket("t3", "raffle-3", "user-alice"),
      ],
      1,
    );

    const result = draw.execute();

    expect(result).toEqual([{ raffleId: "raffle-3", outcome: "drawn", winnerId: "user-bob" }]);
    expect(random.calls).toEqual([3]);
    expect(store.get("raffle-3")).toMatchObject({ status: "drawn", winnerId: "user-bob", updatedAt: T });
    expect(store.get("raffle-1")).toEqual(raffle("raffle-1", { drawDate: future }));
  });

  test("cancels a due raffle that sold no tickets without drawing", async () => {
    const { draw, random, store } = await setup([raffle("raffle-5")], []);

    const result = draw.execute();

    expect(result).toEqual([{ raffleId: "raffle-5", outcome: "cancelled" }]);
    expect(random.calls).toEqual([]);
    expect(store.get("raffle-5")).toMatchObject({ status: "cancelled", winnerId: null, updatedAt: T });
  });

  test("reports a failing raffle and still draws the next one", async () => {
    const { draw, uow, store } = await setup(
      [raffle("raffle-a", { ticketsSold: 1 }), raffle("raffle-b", { ticketsSold: 1 })],
      [ticket("t1", "raffle-a", "user-alice"), ticket("t2", "raffle-b", "user-bob")],
      0,
      "raffle-a",
    );

    const result = draw.execute();

    expect(result).toEqual([
      { raffleId: "raffle-a", outcome: "failed", error: "db exploded" },
      { raffleId: "raffle-b", outcome: "drawn", winnerId: "user-bob" },
    ]);
    expect(uow.calls).toBe(2);
    expect(store.get("raffle-a")?.status).toBe("active");
    expect(store.get("raffle-b")?.status).toBe("drawn");
  });
});
