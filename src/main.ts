import { createApplication } from "difunkt";
import { AppModule } from "./app.module";
import { Logger } from "./domain/ports";
import { App } from "./interface/app";
import { DrawScheduler } from "./interface/scheduler";

const resolve = await createApplication(AppModule);
const logger = resolve(Logger);
const port = Number(Bun.env.PORT ?? 3000);
resolve(App).listen(port);

logger.info("listening", { url: `http://localhost:${port}` });

resolve(DrawScheduler).start();
