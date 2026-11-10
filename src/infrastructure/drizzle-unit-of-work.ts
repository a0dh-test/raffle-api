import { createProvider } from "difunkt";
import type { UnitOfWork } from "../domain/ports";
import { Database } from "./db/database";

export const DrizzleUnitOfWork = createProvider(({ inject }): UnitOfWork => {
  const db = inject(Database);

  return {
    run: (fn) =>
      db.transaction(() => {
        const result = fn();
        // Checked inside the transaction so the throw rolls the callback's writes back.
        if (result instanceof Promise) throw new Error("UnitOfWork.run requires a synchronous callback");
        return result;
      }),
  };
});
