import { t } from "elysia";
import { ticketsRemaining } from "../domain/rules";
import type { IRaffle, ITicket } from "../domain/types";

export const PrizeSchema = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.String(),
  value: t.Number(),
  imageUrl: t.Nullable(t.String()),
});

export const RaffleSchema = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.String(),
  prize: PrizeSchema,
  ticketPrice: t.Number(),
  maxTickets: t.Integer(),
  ticketsSold: t.Integer(),
  ticketsRemaining: t.Integer(),
  drawDate: t.String(),
  status: t.Union([t.Literal("draft"), t.Literal("active"), t.Literal("drawn"), t.Literal("cancelled")]),
  winnerId: t.Nullable(t.String()),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const TicketSchema = t.Object({
  id: t.String(),
  raffleId: t.String(),
  userId: t.String(),
  purchasedAt: t.String(),
});

export const PurchaseBody = t.Object({ quantity: t.Number({ multipleOf: 1, minimum: 1 }) });
export const PurchaseResponse = t.Object({ tickets: t.Array(TicketSchema), balance: t.Number() });
export const ErrorBody = t.Object({ error: t.Object({ code: t.String(), message: t.String() }) });

export const toRaffleDto = (r: IRaffle): typeof RaffleSchema.static => ({
  ...r,
  ticketsRemaining: ticketsRemaining(r),
  drawDate: r.drawDate.toISOString(),
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export const toTicketDto = (tk: ITicket): typeof TicketSchema.static => ({
  ...tk,
  purchasedAt: tk.purchasedAt.toISOString(),
});
