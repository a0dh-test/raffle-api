import { createProvider } from "difunkt";
import { Elysia, t } from "elysia";
import { GetRaffle } from "../../application/get-raffle";
import { ListActiveRaffles } from "../../application/list-active-raffles";
import { ErrorBody, RaffleSchema, toRaffleDto } from "../schemas";

export const RaffleRoutes = createProvider(({ inject }) => {
  const list = inject(ListActiveRaffles);
  const getRaffle = inject(GetRaffle);

  return new Elysia({ prefix: "/raffles" })
    .get("/", () => list.execute().map(toRaffleDto), { response: { 200: t.Array(RaffleSchema) } })
    .get("/:id", ({ params }) => toRaffleDto(getRaffle.execute(params.id)), {
      params: t.Object({ id: t.String() }),
      response: { 200: RaffleSchema, 404: ErrorBody },
    });
});
