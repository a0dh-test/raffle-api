import { createProvider } from "difunkt";
import { Elysia } from "elysia";
import { DomainError, type DomainErrorCode } from "../../domain/errors";
import { Logger } from "../../domain/ports";

// Typed over every domain code, so adding an error without choosing its status fails the typecheck.
const STATUS: Record<DomainErrorCode, number> = {
  INVALID_QUANTITY: 400,
  UNAUTHENTICATED: 401,
  RAFFLE_NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  RAFFLE_NOT_ACTIVE: 409,
  RAFFLE_CLOSED: 409,
  NOT_ENOUGH_TICKETS: 409,
  INSUFFICIENT_BALANCE: 409,
};

const body = (code: string, message: string) => ({ error: { code, message } });

export const ErrorHandlerPlugin = createProvider(({ inject }) => {
  const logger = inject(Logger);

  return new Elysia({ name: "error-handler" }).onError({ as: "global" }, ({ code, error, set }) => {
    if (error instanceof DomainError) {
      set.status = STATUS[error.code];
      return body(error.code, error.message);
    }
    // Elysia reports a response that breaks its schema as VALIDATION too; that is our bug, not the client's.
    if (code === "VALIDATION" && error.type === "response") {
      logger.error("response failed its schema", { error });
      set.status = 500;
      return body("INTERNAL", "Internal error");
    }
    if (code === "VALIDATION") {
      const first = error.valueError;
      set.status = 400;
      return body(
        "VALIDATION",
        first ? `${first.path.slice(1) || error.type}: ${first.message}` : "Request validation failed",
      );
    }
    if (code === "PARSE") {
      set.status = 400;
      return body("PARSE", "Request body could not be parsed");
    }
    if (code === "NOT_FOUND") {
      set.status = 404;
      return body("NOT_FOUND", "Route not found");
    }
    logger.error("unhandled error", { error });
    set.status = 500;
    return body("INTERNAL", "Internal error");
  });
});
