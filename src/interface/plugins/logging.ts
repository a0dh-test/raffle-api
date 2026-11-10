import { createProvider } from "difunkt";
import { Elysia } from "elysia";
import { Logger } from "../../domain/ports";

export const RequestLoggingPlugin = createProvider(({ inject }) => {
  const logger = inject(Logger);

  return (
    new Elysia({ name: "request-logging" })
      // Captured before the handler runs: once the response is sent, Bun releases the request and its url reads as empty.
      .derive({ as: "global" }, ({ request }) => ({ pathname: new URL(request.url).pathname }))
      .onAfterResponse({ as: "global" }, ({ request, pathname, path, set }) => {
        logger.info(`${request.method} ${pathname ?? path}`, { status: set.status ?? 200 });
      })
  );
});
