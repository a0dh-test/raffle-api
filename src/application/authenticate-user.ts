import { createProvider } from "difunkt";
import { Unauthenticated } from "../domain/errors";
import { UserRepository } from "../domain/ports";

export const AuthenticateUser = createProvider(({ inject }) => {
  const users = inject(UserRepository);

  return {
    execute(userId: string | undefined): string {
      if (!userId || !users.findById(userId)) throw new Unauthenticated();
      return userId;
    },
  };
});
