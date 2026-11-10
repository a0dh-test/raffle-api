import type { LogContext, Logger } from "../domain/ports";

/** One line per event: `<iso time> <LEVEL> <message> key=value ...`; errors go to stderr. */
export function createConsoleLogger(): Logger {
  const line = (level: string, message: string, context?: LogContext) =>
    `${new Date().toISOString()} ${level} ${message}${formatContext(context)}`;
  return {
    info: (message, context) => console.log(line("INFO ", message, context)),
    error: (message, context) => console.error(line("ERROR", message, context)),
  };
}

function formatContext(context: LogContext = {}): string {
  return Object.entries(context)
    .map(([key, value]) => ` ${key}=${formatValue(value)}`)
    .join("");
}

function formatValue(value: unknown): string {
  if (value instanceof Error) return value.stack ?? value.message;
  if (typeof value === "string" && !/\s/.test(value)) return value;
  return JSON.stringify(value) ?? String(value);
}
