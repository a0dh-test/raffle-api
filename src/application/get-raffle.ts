import { createProvider } from "difunkt";
import { RaffleNotFound } from "../domain/errors";
import { RaffleRepository } from "../domain/ports";
import type { IRaffle } from "../domain/types";

export const GetRaffle = createProvider(({ inject }) => {
  const raffles = inject(RaffleRepository);

  return {
    execute(id: string): IRaffle {
      const raffle = raffles.findById(id);
      if (!raffle) throw new RaffleNotFound(id);
      return raffle;
    },
  };
});
