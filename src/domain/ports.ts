// Interface + same-named Difunkt token per port (companion pattern).
// Every port is synchronous on purpose: bun:sqlite transactions only wrap
// synchronous work, so an async callback would commit its writes even if it later throws.
import { createProviderToken } from "difunkt";
import type { IRaffle, ITicket, IUser } from "./types";

export interface RaffleRepository {
  findActive(): IRaffle[];
  findById(id: string): IRaffle | null;
  sell(id: string, quantity: number, now: Date): void;
  markDrawn(id: string, winnerId: string, now: Date): void;
  markCancelled(id: string, now: Date): void;
}
export const RaffleRepository = createProviderToken<RaffleRepository>("RaffleRepository");

export interface TicketRepository {
  findByRaffle(raffleId: string): ITicket[];
  createMany(tickets: ITicket[]): void;
}
export const TicketRepository = createProviderToken<TicketRepository>("TicketRepository");

export interface UserRepository {
  findById(id: string): IUser | null;
  debit(id: string, amount: number): void;
}
export const UserRepository = createProviderToken<UserRepository>("UserRepository");

export interface UnitOfWork {
  run<T>(fn: () => T): T;
}
export const UnitOfWork = createProviderToken<UnitOfWork>("UnitOfWork");

export interface Clock {
  now(): Date;
}
export const Clock = createProviderToken<Clock>("Clock");

export interface Random {
  int(maxExclusive: number): number;
}
export const Random = createProviderToken<Random>("Random");

export type LogContext = Record<string, unknown>;
export interface Logger {
  info(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}
export const Logger = createProviderToken<Logger>("Logger");
