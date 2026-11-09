import { join } from "node:path";
import { createModule, provide } from "difunkt";
import { Clock, Logger, RaffleRepository, Random, TicketRepository, UnitOfWork, UserRepository } from "../domain/ports";
import { Database, DbPath, migrateAndSeed } from "./db/database";
import { DrizzleRaffleRepository } from "./drizzle-raffle.repository";
import { DrizzleTicketRepository } from "./drizzle-ticket.repository";
import { DrizzleUnitOfWork } from "./drizzle-unit-of-work";
import { DrizzleUserRepository } from "./drizzle-user.repository";
import { createConsoleLogger } from "./logger";
import { SecureRandom, SystemClock } from "./system";

export const InfrastructureModule = createModule({
  providers: [
    provide(DbPath, { value: join(import.meta.dir, "../../raffle.sqlite") }),
    Database,
    DrizzleRaffleRepository,
    DrizzleTicketRepository,
    DrizzleUserRepository,
    DrizzleUnitOfWork,
    provide(RaffleRepository, { factory: ({ inject }) => inject(DrizzleRaffleRepository) }),
    provide(TicketRepository, { factory: ({ inject }) => inject(DrizzleTicketRepository) }),
    provide(UserRepository, { factory: ({ inject }) => inject(DrizzleUserRepository) }),
    provide(UnitOfWork, { factory: ({ inject }) => inject(DrizzleUnitOfWork) }),
    provide(Clock, { value: SystemClock }),
    provide(Random, { value: SecureRandom }),
    provide(Logger, { factory: () => createConsoleLogger() }),
  ],
  runnables: [({ inject }) => migrateAndSeed(inject(Database), inject(Clock).now())],
});
