# Raffle API

An HTTP API for ticketed prize raffles. Clients list open raffles, read one raffle and, as an authenticated user, buy tickets with their balance. A scheduled job draws every raffle whose draw date has passed and records a random winner from the tickets sold. Built with Bun, Elysia, Difunkt, Drizzle ORM and SQLite (`bun:sqlite`).

## Setup and run

Requires Bun 1.3.12 or newer (tested on 1.3.13), for the in-process `Bun.cron`.

```sh
bun install
bun run dev     # watch mode; bun start runs without watching
```

The server listens on `PORT` (default 3000). On first run it creates `raffle.sqlite` at the repo root, migrates and seeds it; delete the file to reset. The log is one line per event, for example:

```
2026-11-07T20:26:33.570Z INFO  listening url=http://localhost:3000
2026-11-07T20:26:33.572Z INFO  raffle drawn raffleId=raffle-3 winnerId=user-alice
2026-11-07T20:26:35.538Z INFO  POST /raffles/raffle-1/tickets status=201
```

## Test

```sh
bun test
bun run typecheck
bun run lint        # Biome; bun run lint:fix applies fixes
```

Tests cover the domain rules, the authenticate, purchase and draw use cases on in-memory fakes, the repositories and unit of work on an in-memory database, and the HTTP API end to end. Every port is a Difunkt token, so a test swaps any dependency through `createApplication` (see `tests/bootstrap.ts`):

```ts
createApplication(ApplicationModule, {
  providers: [
    provide(RaffleRepository, { factory: () => ports.raffles }),
    provide(Clock, { factory: () => ports.clock }),
    // ...
  ],
});
```

CI runs install, typecheck, lint and tests on every push and pull request.

## Seeded data

| User | Balance |
|---|---|
| `user-alice` | 100 |
| `user-bob` | 20 |
| `user-carol` | 0 |

| Raffle | Status | Price | Max tickets | Draw date |
|---|---|---|---|---|
| `raffle-1` | active | 5 | 10 | one year after first boot |
| `raffle-2` | active | 10 | 5 | two minutes after first boot; buy tickets before it is drawn, or it is cancelled |
| `raffle-3` | active, drawn at boot | 5 | 10 | already past; 3 tickets seeded |
| `raffle-4` | draft | 5 | 10 | 30 days after first boot; never listed or purchasable |

## API

- `GET /raffles`: active raffles whose draw date has not passed, with prize, ticket price and `ticketsRemaining`.
- `GET /raffles/:id`: one raffle of any status, with `winnerId` once drawn.
- `POST /raffles/:id/tickets`: buy tickets as the user in `Authorization: Bearer <userId>`. Body `{ "quantity": <integer >= 1> }`. Responds 201 with the tickets and the remaining balance.

```sh
curl -X POST localhost:3000/raffles/raffle-1/tickets \
  -H 'Authorization: Bearer user-alice' -H 'Content-Type: application/json' \
  -d '{ "quantity": 2 }'
# {"tickets":[{"id":"9f0f…","raffleId":"raffle-1","userId":"user-alice","purchasedAt":"…"}, …],"balance":90}
```

Interactive docs are served at `/openapi`, generated from the route schemas; the raw spec at `/openapi/json` imports into Postman or any OpenAPI client. Both are disabled when `NODE_ENV=production`.

Every error has the same body: `{ "error": { "code": "INSUFFICIENT_BALANCE", "message": "…" } }`.

| Status | Codes |
|---|---|
| 400 | `VALIDATION`, `PARSE`, `INVALID_QUANTITY` |
| 401 | `UNAUTHENTICATED` |
| 404 | `RAFFLE_NOT_FOUND`, `NOT_FOUND` (unknown route) |
| 409 | `RAFFLE_NOT_ACTIVE`, `RAFFLE_CLOSED`, `NOT_ENOUGH_TICKETS`, `INSUFFICIENT_BALANCE` |
| 500 | `INTERNAL`, with no detail leaked |

## Design

Four layers under `src/`:

- `domain/`: entity types, errors, pure business rules (`rules.ts`) and port interfaces with their Difunkt tokens (`ports.ts`). No HTTP or database code.
- `application/`: one provider per use case: authenticate, list, get, purchase, draw.
- `infrastructure/`: Drizzle schema, migrations and seed, repositories, unit of work, clock, random and logger.
- `interface/`: the Elysia app, plugins, routes, TypeBox schemas and the draw scheduler.

Application, infrastructure and interface are Difunkt modules composed in `app.module.ts`. Use cases, routes and the scheduler resolve every dependency through Difunkt, never by importing an implementation.

The auth plugin is a macro that reads the bearer token and has the `AuthenticateUser` use case check it; the route receives `userId`. A global error handler maps every error to one body shape, keeping the HTTP status table in the interface layer. A logging plugin writes one line per request. Routes validate body, params and response with TypeBox.

Migrations are generated from `src/infrastructure/db/schema.ts` with `bun run db:generate` and applied at boot.

`Bun.cron` runs the draw every minute, plus once at boot. Each raffle is drawn in its own transaction, so one failure does not block the others. A failing tick is logged rather than crashing the process. A raffle with no tickets is cancelled.

## Atomicity

A purchase runs in one synchronous SQLite transaction: load the user and raffle, check the rules, debit the balance, increment the ticket count and insert the tickets. Any error rolls back all of it. Bun runs JavaScript on one thread and `bun:sqlite` transactions are synchronous, so purchases cannot interleave. Ports are therefore synchronous, and the unit of work rejects an async callback, since `bun:sqlite` would commit as soon as the callback returned its promise.

`CHECK` constraints (`balance >= 0`, `tickets_sold <= max_tickets`) back the rules in the database: a violation rolls the transaction back and surfaces as a 500. The draw reads due raffles before each transaction starts, so settling is guarded: `UPDATE … WHERE status = 'active'` must hit a row or it throws, and a raffle another runner already settled is reported as a failed draw instead of getting a second winner. Running several instances would also need row locks, idempotency keys and a single draw runner.

## Trade-offs

- Auth is a mock: the bearer token is the user id.
- No idempotency key, so a retried purchase buys twice.
- Money is a plain number; a real system would use integer minor units.
- Purchases close at the draw date, even before the job runs.
- No endpoints to create raffles; they come from the seed.
- No endpoint to list a user's tickets or balance; the purchase response returns both.
- Validation runs before auth, so an invalid body without a token returns 400.
- The winner is one ticket chosen uniformly, so odds scale with tickets held.
- Quantity is checked twice on purpose: the request schema rejects it at the HTTP boundary, and the domain rule still guards the use case when it is called directly.
- Ticket ids use `crypto.randomUUID()` directly, a deliberate exception to the `Clock` and `Random` ports: tests never need predictable ids.
