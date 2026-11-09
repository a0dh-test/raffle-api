import { createProvider } from "difunkt";
import { Elysia, t } from "elysia";
import { PurchaseTickets } from "../../application/purchase-tickets";
import { AuthPlugin } from "../plugins/auth";
import { ErrorBody, PurchaseBody, PurchaseResponse, toTicketDto } from "../schemas";

export const TicketRoutes = createProvider(({ inject }) => {
  const purchase = inject(PurchaseTickets);
  const authPlugin = inject(AuthPlugin);

  return new Elysia({ prefix: "/raffles" }).use(authPlugin).post(
    "/:id/tickets",
    ({ userId, params, body, set }) => {
      const { tickets, balance } = purchase.execute({ userId, raffleId: params.id, quantity: body.quantity });
      set.status = 201;
      return { tickets: tickets.map(toTicketDto), balance };
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      body: PurchaseBody,
      response: { 201: PurchaseResponse, 400: ErrorBody, 401: ErrorBody, 404: ErrorBody, 409: ErrorBody },
    },
  );
});
