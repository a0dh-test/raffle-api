import { InsufficientBalance, InvalidQuantity, NotEnoughTickets, RaffleClosed, RaffleNotActive } from "./errors";
import type { IRaffle } from "./types";

export function ticketsRemaining(raffle: IRaffle): number {
  return raffle.maxTickets - raffle.ticketsSold;
}

export function isOpen(raffle: IRaffle, now: Date): boolean {
  return raffle.status === "active" && raffle.drawDate.getTime() > now.getTime();
}

export function isDue(raffle: IRaffle, now: Date): boolean {
  return raffle.status === "active" && raffle.drawDate.getTime() <= now.getTime();
}

export function assertPurchasable(raffle: IRaffle, quantity: number, now: Date): void {
  if (!Number.isInteger(quantity) || quantity < 1) throw new InvalidQuantity(quantity);
  if (raffle.status !== "active") throw new RaffleNotActive(raffle.id);
  if (!isOpen(raffle, now)) throw new RaffleClosed(raffle.id);
  const remaining = ticketsRemaining(raffle);
  if (quantity > remaining) throw new NotEnoughTickets(quantity, remaining);
}

export function assertCanAfford(balance: number, total: number): void {
  if (balance < total) throw new InsufficientBalance(balance, total);
}
