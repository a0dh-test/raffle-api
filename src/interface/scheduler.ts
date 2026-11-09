import { createProvider } from "difunkt";
import { DrawDueRaffles } from "../application/draw-due-raffles";
import { Logger } from "../domain/ports";

export const DrawScheduler = createProvider(({ inject }) => {
  const draw = inject(DrawDueRaffles);
  const logger = inject(Logger);

  // A throw escaping a Bun.cron callback exits the process, so the whole tick is guarded.
  const tick = (): void => {
    try {
      for (const o of draw.execute()) {
        if (o.outcome === "drawn") logger.info("raffle drawn", { raffleId: o.raffleId, winnerId: o.winnerId });
        else if (o.outcome === "cancelled") logger.info("raffle cancelled, no tickets sold", { raffleId: o.raffleId });
        else logger.error("draw failed", { raffleId: o.raffleId, error: o.error });
      }
    } catch (error) {
      logger.error("draw tick failed", { error });
    }
  };

  return {
    tick,
    start(): void {
      tick();
      Bun.cron("* * * * *", tick);
    },
  };
});
