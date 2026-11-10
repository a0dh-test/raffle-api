import { createApplication, provide } from "difunkt";
import { AppModule } from "../src/app.module";
import { ApplicationModule } from "../src/application/application.module";
import {
  Clock,
  Logger,
  RaffleRepository,
  Random,
  TicketRepository,
  UnitOfWork,
  UserRepository,
} from "../src/domain/ports";
import { DbPath } from "../src/infrastructure/db/database";
import { App } from "../src/interface/app";
import { recordingLogger } from "./fakes";

export function useCases(ports: {
  raffles: RaffleRepository;
  tickets: TicketRepository;
  users: UserRepository;
  uow: UnitOfWork;
  clock: Clock;
  random: Random;
}) {
  return createApplication(ApplicationModule, {
    providers: [
      provide(RaffleRepository, { factory: () => ports.raffles }),
      provide(TicketRepository, { factory: () => ports.tickets }),
      provide(UserRepository, { factory: () => ports.users }),
      provide(UnitOfWork, { factory: () => ports.uow }),
      provide(Clock, { factory: () => ports.clock }),
      provide(Random, { factory: () => ports.random }),
    ],
  });
}

/** The whole app on an in-memory database, with a recording logger so the suite stays silent and tests can assert on logs. */
export async function httpApp(
  extraProviders: NonNullable<NonNullable<Parameters<typeof createApplication>[1]>["providers"]> = [],
) {
  const logs = recordingLogger();
  const resolve = await createApplication(AppModule, {
    providers: [provide(DbPath, { value: ":memory:" }), provide(Logger, { factory: () => logs }), ...extraProviders],
  });
  return { app: resolve(App), resolve, logs };
}
