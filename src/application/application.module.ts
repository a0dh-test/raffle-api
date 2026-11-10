import { createModule } from "difunkt";
import { AuthenticateUser } from "./authenticate-user";
import { DrawDueRaffles } from "./draw-due-raffles";
import { GetRaffle } from "./get-raffle";
import { ListActiveRaffles } from "./list-active-raffles";
import { PurchaseTickets } from "./purchase-tickets";

export const ApplicationModule = createModule({
  providers: [AuthenticateUser, ListActiveRaffles, GetRaffle, PurchaseTickets, DrawDueRaffles],
});
