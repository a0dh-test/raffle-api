import { createProvider } from "difunkt";
import { Clock, RaffleRepository } from "../domain/ports";
import { isOpen } from "../domain/rules";
import type { IRaffle } from "../domain/types";

export const ListActiveRaffles = createProvider(({ inject }) => {
  const raffles = inject(RaffleRepository);
  const clock = inject(Clock);

  return {
    execute(): IRaffle[] {
      const now = clock.now();
      return raffles.findActive().filter((r) => isOpen(r, now));
    },
  };
});
