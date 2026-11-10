export type DomainErrorCode =
  | "INVALID_QUANTITY"
  | "UNAUTHENTICATED"
  | "RAFFLE_NOT_FOUND"
  | "RAFFLE_NOT_ACTIVE"
  | "RAFFLE_CLOSED"
  | "NOT_ENOUGH_TICKETS"
  | "INSUFFICIENT_BALANCE"
  | "USER_NOT_FOUND";

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class Unauthenticated extends DomainError {
  constructor(message = "Missing or unknown user") {
    super("UNAUTHENTICATED", message);
    this.name = "Unauthenticated";
  }
}

export class InvalidQuantity extends DomainError {
  constructor(quantity: number) {
    super("INVALID_QUANTITY", `Quantity must be a positive integer, got ${quantity}`);
    this.name = "InvalidQuantity";
  }
}

export class RaffleNotFound extends DomainError {
  constructor(id: string) {
    super("RAFFLE_NOT_FOUND", `Raffle ${id} not found`);
    this.name = "RaffleNotFound";
  }
}

export class RaffleNotActive extends DomainError {
  constructor(id: string) {
    super("RAFFLE_NOT_ACTIVE", `Raffle ${id} is not active`);
    this.name = "RaffleNotActive";
  }
}

export class RaffleClosed extends DomainError {
  constructor(id: string) {
    super("RAFFLE_CLOSED", `Raffle ${id} is closed for purchases`);
    this.name = "RaffleClosed";
  }
}

export class NotEnoughTickets extends DomainError {
  constructor(requested: number, remaining: number) {
    super("NOT_ENOUGH_TICKETS", `Requested ${requested} tickets but only ${remaining} remain`);
    this.name = "NotEnoughTickets";
  }
}

export class InsufficientBalance extends DomainError {
  constructor(balance: number, total: number) {
    super("INSUFFICIENT_BALANCE", `Balance ${balance} is less than the total ${total}`);
    this.name = "InsufficientBalance";
  }
}

export class UserNotFound extends DomainError {
  constructor(id: string) {
    super("USER_NOT_FOUND", `User ${id} not found`);
    this.name = "UserNotFound";
  }
}
