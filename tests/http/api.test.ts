import { beforeEach, describe, expect, test } from "bun:test";
import { provide } from "difunkt";
import { DrawDueRaffles } from "../../src/application/draw-due-raffles";
import { GetRaffle } from "../../src/application/get-raffle";
import { PurchaseTickets } from "../../src/application/purchase-tickets";
import { DrawScheduler } from "../../src/interface/scheduler";
import type { PurchaseResponse, RaffleSchema } from "../../src/interface/schemas";
import { httpApp } from "../bootstrap";

type TestApp = Awaited<ReturnType<typeof httpApp>>["app"];
type RaffleDto = typeof RaffleSchema.static;
type PurchaseDto = typeof PurchaseResponse.static;

const get = (app: TestApp, path: string) => app.handle(new Request(`http://localhost${path}`));
const getRaffle = async (app: TestApp, id: string) => (await (await get(app, `/raffles/${id}`)).json()) as RaffleDto;
const buy = (app: TestApp, raffleId: string, body: unknown, userId?: string) =>
  app.handle(
    new Request(`http://localhost/raffles/${raffleId}/tickets`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(userId ? { authorization: `Bearer ${userId}` } : {}) },
      body: JSON.stringify(body),
    }),
  );

describe("http api", () => {
  let app: TestApp;
  let resolve: Awaited<ReturnType<typeof httpApp>>["resolve"];

  beforeEach(async () => {
    ({ app, resolve } = await httpApp());
  });

  test("lists only open raffles with nested prize, ticketsRemaining and ISO dates", async () => {
    const res = await get(app, "/raffles");
    expect(res.status).toBe(200);
    const raffles = ((await res.json()) as RaffleDto[]).sort((a, b) => a.id.localeCompare(b.id));
    expect(raffles.map((r) => r.id)).toEqual(["raffle-1", "raffle-2"]);
    expect(raffles.map((r) => r.ticketsRemaining)).toEqual([10, 5]);
    for (const r of raffles) {
      expect(Object.keys(r.prize).sort()).toEqual(["description", "id", "imageUrl", "name", "value"]);
      for (const key of ["drawDate", "createdAt", "updatedAt"] as const) {
        expect(new Date(r[key]).toISOString()).toBe(r[key]);
      }
    }
  });

  test("gets a raffle by id and answers 404 for unknown raffles and routes", async () => {
    const draft = await get(app, "/raffles/raffle-4");
    expect(draft.status).toBe(200);
    expect(((await draft.json()) as RaffleDto).status).toBe("draft");

    const missing = await get(app, "/raffles/nope");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: { code: "RAFFLE_NOT_FOUND", message: expect.any(String) } });

    const route = await get(app, "/nope");
    expect(route.status).toBe(404);
    expect(await route.json()).toEqual({ error: { code: "NOT_FOUND", message: expect.any(String) } });
  });

  test("rejects a purchase without a known user with 401", async () => {
    for (const userId of [undefined, "user-nobody"]) {
      const res = await buy(app, "raffle-1", { quantity: 1 }, userId);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: { code: "UNAUTHENTICATED", message: expect.any(String) } });
    }
  });

  test("rejects an invalid body with 400 VALIDATION naming the field", async () => {
    const res = await buy(app, "raffle-1", { quantity: 0 }, "user-alice");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: "VALIDATION", message: "quantity: Expected number to be greater or equal to 1" },
    });
    expect((await buy(app, "raffle-1", { quantity: "2" }, "user-alice")).status).toBe(400);
  });

  test("buys tickets, returns the new balance and updates the raffle", async () => {
    const res = await buy(app, "raffle-1", { quantity: 2 }, "user-alice");
    expect(res.status).toBe(201);
    const body = (await res.json()) as PurchaseDto;
    expect(body.tickets).toHaveLength(2);
    expect(body.balance).toBe(90);

    const raffle = await getRaffle(app, "raffle-1");
    expect(raffle.ticketsSold).toBe(2);

    const lowercase = await app.handle(
      new Request("http://localhost/raffles/raffle-1/tickets", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "bearer user-alice" },
        body: JSON.stringify({ quantity: 1 }),
      }),
    );
    expect(lowercase.status).toBe(201);
    expect((await getRaffle(app, "raffle-1")).ticketsSold).toBe(3);
    expect(raffle.ticketsRemaining).toBe(8);
  });

  test.each([
    ["user-bob", "raffle-1", 5, "INSUFFICIENT_BALANCE", 0],
    ["user-alice", "raffle-1", 11, "NOT_ENOUGH_TICKETS", 0],
    ["user-alice", "raffle-3", 1, "RAFFLE_CLOSED", 3],
  ])(
    "%s buying %s x%d is rejected with 409 and leaves the raffle untouched",
    async (userId, raffleId, quantity, code, sold) => {
      const res = await buy(app, raffleId, { quantity }, userId);
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ error: { code, message: expect.any(String) } });
      expect((await getRaffle(app, raffleId)).ticketsSold).toBe(sold);
    },
  );

  test("answers 500 without leaking the error when a use case blows up, and logs it", async () => {
    const { app: broken, logs } = await httpApp([
      provide(PurchaseTickets, {
        factory: () => ({
          execute: () => {
            throw new Error("boom");
          },
        }),
      }),
    ]);
    const res = await buy(broken, "raffle-1", { quantity: 1 }, "user-alice");
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(JSON.parse(text)).toEqual({ error: { code: "INTERNAL", message: "Internal error" } });
    expect(text).not.toContain("boom");
    const logged = logs.entries.find((e) => e.level === "error");
    expect(logged?.message).toBe("unhandled error");
    const error = logged?.context?.error;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("boom");
  });

  test("draws the due seeded raffle through the real repositories and leaves open raffles alone", async () => {
    resolve(DrawDueRaffles).execute();

    const drawn = await getRaffle(app, "raffle-3");
    expect(drawn.status).toBe("drawn");
    expect(drawn.winnerId).toBeOneOf(["user-alice", "user-bob"]);

    const open = await getRaffle(app, "raffle-1");
    expect(open.status).toBe("active");
    expect(open.winnerId).toBeNull();
  });

  test("a scheduler tick logs a failing draw instead of throwing, so the cron cannot kill the process", async () => {
    const { resolve: broken, logs } = await httpApp([
      provide(DrawDueRaffles, {
        factory: () => ({
          execute: () => {
            throw new Error("db down");
          },
        }),
      }),
    ]);
    expect(() => broken(DrawScheduler).tick()).not.toThrow();
    const logged = logs.entries.find((e) => e.level === "error");
    expect(logged?.message).toBe("draw tick failed");
    const error = logged?.context?.error;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("db down");
  });

  test("answers 500 and logs when a response breaks its own schema, instead of blaming the client", async () => {
    const seeded = resolve(GetRaffle).execute("raffle-1");
    const { app: broken, logs } = await httpApp([
      provide(GetRaffle, { factory: () => ({ execute: () => ({ ...seeded, ticketsSold: 1.5 }) }) }),
    ]);
    const res = await get(broken, "/raffles/raffle-1");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "INTERNAL", message: "Internal error" } });
    expect(logs.entries.find((e) => e.level === "error")?.message).toBe("response failed its schema");
  });
});
