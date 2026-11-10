import { randomInt } from "node:crypto";
import type { Clock, Random } from "../domain/ports";

export const SystemClock: Clock = { now: () => new Date() };

export const SecureRandom: Random = { int: (maxExclusive) => randomInt(maxExclusive) };
