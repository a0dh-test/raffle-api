import { createProvider } from "difunkt";
import { Elysia } from "elysia";
import { AuthenticateUser } from "../../application/authenticate-user";

export const AuthPlugin = createProvider(({ inject }) => {
  const authenticate = inject(AuthenticateUser);

  return new Elysia({ name: "auth" }).macro({
    auth: {
      resolve: ({ headers }) => {
        const token = headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
        return { userId: authenticate.execute(token) };
      },
    },
  });
});
