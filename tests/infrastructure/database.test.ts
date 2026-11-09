import { beforeEach, describe, expect, test } from "bun:test";
import { createApplication, provide } from "difunkt";
import { RaffleRepository, TicketRepository, UnitOfWork, UserRepository } from "../../src/domain/ports";
import { Database, DbPath } from "../../src/infrastructure/db/database";
import { seed } from "../../src/infrastructure/db/seed";
import { InfrastructureModule } from "../../src/infrastructure/infrastructure.module";

describe("infrastructure", () => {
  let resolve: Awaited<ReturnType<typeof createApplication>>;

  beforeEach(async () => {
    resolve = await createApplication(InfrastructureModule, { providers: [provide(DbPath, { value: ":memory:" })] });
  });

  test("migrates and seeds an empty database, and seeding twice adds nothing", () => {
    const db = resolve(Database);
    const users = resolve(UserRepository);
    const raffles = resolve(RaffleRepository);
    const counts = () => ({
      users: db.$client.query("select count(*) as n from users").get() as { n: number },
      raffles: db.$client.query("select count(*) as n from raffles").get() as { n: number },
      tickets: db.$client.query("select count(*) as n from tickets").get() as { n: number },
    });

    expect(counts()).toEqual({ users: { n: 3 }, raffles: { n: 4 }, tickets: { n: 3 } });
    expect(["user-alice", "user-bob", "user-carol"].map((id) => users.findById(id)?.balance)).toEqual([100, 20, 0]);
    expect(["raffle-1", "raffle-2", "raffle-3", "raffle-4"].map((id) => raffles.findById(id)?.status)).toEqual([
      "active",
      "active",
      "active",
      "draft",
    ]);
    expect(
      resolve(TicketRepository)
        .findByRaffle("raffle-3")
        .map((t) => t.userId),
    ).toEqual(["user-alice", "user-bob", "user-alice"]);

    seed(db, new Date());
    expect(counts()).toEqual({ users: { n: 3 }, raffles: { n: 4 }, tickets: { n: 3 } });
  });

  test("rolls back every write when the unit of work throws", () => {
    const uow = resolve(UnitOfWork);
    const users = resolve(UserRepository);
    const tickets = resolve(TicketRepository);

    expect(() =>
      uow.run(() => {
        users.debit("user-alice", 10);
        tickets.createMany([{ id: "ticket-x", raffleId: "raffle-1", userId: "user-alice", purchasedAt: new Date() }]);
        throw new Error("boom");
      }),
    ).toThrow("boom");

    expect(users.findById("user-alice")?.balance).toBe(100);
    expect(tickets.findByRaffle("raffle-1")).toEqual([]);
  });

  test("rejects an async callback and rolls its writes back", () => {
    const users = resolve(UserRepository);

    expect(() =>
      resolve(UnitOfWork).run((async () => {
        users.debit("user-alice", 10);
      }) as () => unknown),
    ).toThrow("UnitOfWork.run requires a synchronous callback");

    expect(users.findById("user-alice")?.balance).toBe(100);
  });

  test("settling a raffle that is already settled throws and keeps the first winner", () => {
    const raffles = resolve(RaffleRepository);
    const uow = resolve(UnitOfWork);
    const now = new Date();

    uow.run(() => raffles.markDrawn("raffle-3", "user-alice", now));
    expect(() => uow.run(() => raffles.markDrawn("raffle-3", "user-bob", now))).toThrow(
      "raffle raffle-3 is not active",
    );
    expect(() => uow.run(() => raffles.markCancelled("raffle-3", now))).toThrow("raffle raffle-3 is not active");

    expect(raffles.findById("raffle-3")).toMatchObject({ status: "drawn", winnerId: "user-alice" });
  });
});
