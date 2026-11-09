import { createModule } from "difunkt";
import { App } from "./app";
import { AuthPlugin } from "./plugins/auth";
import { ErrorHandlerPlugin } from "./plugins/error-handler";
import { RequestLoggingPlugin } from "./plugins/logging";
import { RaffleRoutes } from "./routes/raffles";
import { TicketRoutes } from "./routes/tickets";
import { DrawScheduler } from "./scheduler";

export const InterfaceModule = createModule({
  providers: [AuthPlugin, ErrorHandlerPlugin, RequestLoggingPlugin, RaffleRoutes, TicketRoutes, App, DrawScheduler],
});
