import { createProvider } from "difunkt";
import { RaffleNotFound, UserNotFound } from "../domain/errors";
import { Clock, RaffleRepository, TicketRepository, UnitOfWork, UserRepository } from "../domain/ports";
import { assertCanAfford, assertPurchasable } from "../domain/rules";
import type { ITicket } from "../domain/types";

export interface PurchaseTicketsInput {
  userId: string;
  raffleId: string;
  quantity: number;
}

export interface PurchaseTicketsResult {
  tickets: ITicket[];
  balance: number;
}

export const PurchaseTickets = createProvider(({ inject }) => {
  const uow = inject(UnitOfWork);
  const raffles = inject(RaffleRepository);
  const ticketRepo = inject(TicketRepository);
  const users = inject(UserRepository);
  const clock = inject(Clock);

  return {
    execute({ userId, raffleId, quantity }: PurchaseTicketsInput): PurchaseTicketsResult {
      return uow.run(() => {
        const user = users.findById(userId);
        if (!user) throw new UserNotFound(userId);
        const raffle = raffles.findById(raffleId);
        if (!raffle) throw new RaffleNotFound(raffleId);

        const now = clock.now();
        assertPurchasable(raffle, quantity, now);
        const total = raffle.ticketPrice * quantity;
        assertCanAfford(user.balance, total);
        users.debit(userId, total);
        raffles.sell(raffleId, quantity, now);

        const tickets: ITicket[] = Array.from({ length: quantity }, () => ({
          id: crypto.randomUUID(),
          raffleId,
          userId,
          purchasedAt: now,
        }));
        ticketRepo.createMany(tickets);
        return { tickets, balance: user.balance - total };
      });
    },
  };
});
