import { openapi } from "@elysiajs/openapi";
import { createProvider } from "difunkt";
import { Elysia } from "elysia";
import { ErrorHandlerPlugin } from "./plugins/error-handler";
import { RequestLoggingPlugin } from "./plugins/logging";
import { RaffleRoutes } from "./routes/raffles";
import { TicketRoutes } from "./routes/tickets";

export const App = createProvider(({ inject }) =>
  new Elysia()
    .use(
      openapi({
        enabled: Bun.env.NODE_ENV !== "production",
        documentation: {
          info: {
            title: "Raffle API",
            version: "1.0.0",
            description: "Mock auth: send `Authorization: Bearer <userId>`, for example `user-alice`.",
          },
          tags: [
            { name: "Raffles", description: "Browse raffles" },
            { name: "Tickets", description: "Buy tickets with your balance" },
          ],
          components: { securitySchemes: { bearer: { type: "http", scheme: "bearer" } } },
        },
      }),
    )
    .use(inject(ErrorHandlerPlugin))
    .use(inject(RequestLoggingPlugin))
    .use(inject(RaffleRoutes))
    .use(inject(TicketRoutes)),
);
