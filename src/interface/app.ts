import { createProvider } from "difunkt";
import { Elysia } from "elysia";
import { ErrorHandlerPlugin } from "./plugins/error-handler";
import { RequestLoggingPlugin } from "./plugins/logging";
import { RaffleRoutes } from "./routes/raffles";
import { TicketRoutes } from "./routes/tickets";

export const App = createProvider(({ inject }) =>
  new Elysia()
    .use(inject(ErrorHandlerPlugin))
    .use(inject(RequestLoggingPlugin))
    .use(inject(RaffleRoutes))
    .use(inject(TicketRoutes)),
);
