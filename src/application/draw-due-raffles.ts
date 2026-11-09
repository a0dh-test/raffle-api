import { createProvider } from "difunkt";
import { Clock, RaffleRepository, Random, TicketRepository, UnitOfWork } from "../domain/ports";
import { isDue } from "../domain/rules";

export type DrawOutcome =
  | { raffleId: string; outcome: "drawn"; winnerId: string }
  | { raffleId: string; outcome: "cancelled" }
  | { raffleId: string; outcome: "failed"; error: string };

export const DrawDueRaffles = createProvider(({ inject }) => {
  const uow = inject(UnitOfWork);
  const raffles = inject(RaffleRepository);
  const tickets = inject(TicketRepository);
  const clock = inject(Clock);
  const random = inject(Random);

  return {
    execute(): DrawOutcome[] {
      const now = clock.now();
      const due = raffles.findActive().filter((r) => isDue(r, now));
      // Each raffle is drawn in its own transaction so one failure cannot block the rest.
      return due.map((raffle): DrawOutcome => {
        try {
          return uow.run((): DrawOutcome => {
            const sold = tickets.findByRaffle(raffle.id);
            if (sold.length === 0) {
              raffles.markCancelled(raffle.id, now);
              return { raffleId: raffle.id, outcome: "cancelled" };
            }
            const winner = sold[random.int(sold.length)];
            if (!winner) throw new Error(`Random.int(${sold.length}) returned an index out of range`);
            raffles.markDrawn(raffle.id, winner.userId, now);
            return { raffleId: raffle.id, outcome: "drawn", winnerId: winner.userId };
          });
        } catch (e) {
          return { raffleId: raffle.id, outcome: "failed", error: e instanceof Error ? e.message : String(e) };
        }
      });
    },
  };
});
