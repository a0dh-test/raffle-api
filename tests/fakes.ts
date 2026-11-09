import type {
  Clock,
  LogContext,
  Logger,
  RaffleRepository,
  Random,
  TicketRepository,
  UnitOfWork,
  UserRepository,
} from "../src/domain/ports";
import type { IRaffle, ITicket, IUser } from "../src/domain/types";

export function recordingUnitOfWork() {
  const uow = {
    inTransaction: false,
    calls: 0,
    run<T>(fn: () => T): T {
      uow.calls++;
      uow.inTransaction = true;
      try {
        return fn();
      } finally {
        uow.inTransaction = false;
      }
    },
  };
  return uow satisfies UnitOfWork;
}

type Uow = ReturnType<typeof recordingUnitOfWork>;

function guard(uow: Uow) {
  if (!uow.inTransaction) throw new Error("write outside transaction");
}

function must<T>(value: T | undefined, id: string): T {
  if (value === undefined) throw new Error(`no row ${id}`);
  return value;
}

export function fakeRaffleRepository(
  uow: Uow,
  raffles: IRaffle[] = [],
): RaffleRepository & { store: Map<string, IRaffle> } {
  const store = new Map(raffles.map((r) => [r.id, r]));
  // Mirrors the real repository: settling a raffle that is no longer active throws.
  const settle = (id: string, values: Pick<IRaffle, "status" | "winnerId" | "updatedAt">): void => {
    guard(uow);
    const r = must(store.get(id), id);
    if (r.status !== "active") throw new Error(`raffle ${id} is not active`);
    Object.assign(r, values);
  };
  return {
    store,
    findActive: () => [...store.values()].filter((r) => r.status === "active").map((r) => ({ ...r })),
    findById: (id) => {
      const r = store.get(id);
      return r ? { ...r } : null;
    },
    sell(id, quantity, now) {
      guard(uow);
      const r = must(store.get(id), id);
      r.ticketsSold += quantity;
      r.updatedAt = now;
    },
    markDrawn(id, winnerId, now) {
      return settle(id, { status: "drawn", winnerId, updatedAt: now });
    },
    markCancelled(id, now) {
      return settle(id, { status: "cancelled", winnerId: null, updatedAt: now });
    },
  };
}

export function fakeTicketRepository(uow: Uow, tickets: ITicket[] = []): TicketRepository & { store: ITicket[] } {
  const store = [...tickets];
  return {
    store,
    findByRaffle: (raffleId) => store.filter((t) => t.raffleId === raffleId),
    createMany(created) {
      guard(uow);
      store.push(...created);
    },
  };
}

export function fakeUserRepository(uow: Uow, users: IUser[] = []): UserRepository & { store: Map<string, IUser> } {
  const store = new Map(users.map((u) => [u.id, u]));
  return {
    store,
    findById: (id) => {
      const u = store.get(id);
      return u ? { ...u } : null;
    },
    debit(id, amount) {
      guard(uow);
      must(store.get(id), id).balance -= amount;
    },
  };
}

export function fixedClock(date: Date): Clock {
  return { now: () => date };
}

export function fixedRandom(index: number): Random & { calls: number[] } {
  const calls: number[] = [];
  return {
    calls,
    int(maxExclusive: number) {
      calls.push(maxExclusive);
      return index;
    },
  };
}

export type LogEntry = { level: "info" | "error"; message: string; context?: LogContext };

export function recordingLogger(): Logger & { entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const record = (level: LogEntry["level"]) => (message: string, context?: LogContext) => {
    entries.push({ level, message, context });
  };
  return { entries, info: record("info"), error: record("error") };
}
