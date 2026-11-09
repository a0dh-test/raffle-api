import { expect, test } from "bun:test";
import { AuthenticateUser } from "../../src/application/authenticate-user";
import { Unauthenticated } from "../../src/domain/errors";
import { useCases } from "../bootstrap";
import {
  fakeRaffleRepository,
  fakeTicketRepository,
  fakeUserRepository,
  fixedClock,
  fixedRandom,
  recordingUnitOfWork,
} from "../fakes";

test("authenticates a known user and rejects a missing or unknown one", async () => {
  const uow = recordingUnitOfWork();
  const users = fakeUserRepository(uow, [
    { id: "user-alice", email: "a@example.com", name: "Alice", balance: 1, createdAt: new Date() },
  ]);
  const resolve = await useCases({
    uow,
    users,
    raffles: fakeRaffleRepository(uow),
    tickets: fakeTicketRepository(uow),
    clock: fixedClock(new Date()),
    random: fixedRandom(0),
  });
  const auth = resolve(AuthenticateUser);

  expect(auth.execute("user-alice")).toBe("user-alice");
  expect(() => auth.execute("user-nobody")).toThrow(Unauthenticated);
  expect(() => auth.execute(undefined)).toThrow(Unauthenticated);
});
