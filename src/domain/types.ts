// Domain entities, as given in the exercise.

export type RaffleStatus = "draft" | "active" | "drawn" | "cancelled";

export interface IRaffle {
  id: string;
  name: string;
  description: string;
  prize: IPrize;
  ticketPrice: number;
  maxTickets: number;
  ticketsSold: number;
  drawDate: Date;
  status: RaffleStatus;
  winnerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPrize {
  id: string;
  name: string;
  description: string;
  value: number;
  imageUrl: string | null;
}

export interface ITicket {
  id: string;
  raffleId: string;
  userId: string;
  purchasedAt: Date;
}

export interface IUser {
  id: string;
  email: string;
  name: string;
  balance: number;
  createdAt: Date;
}
