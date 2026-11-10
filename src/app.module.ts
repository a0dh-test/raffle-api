import { createModule } from "difunkt";
import { ApplicationModule } from "./application/application.module";
import { InfrastructureModule } from "./infrastructure/infrastructure.module";
import { InterfaceModule } from "./interface/interface.module";

export const AppModule = createModule({
  imports: [InfrastructureModule, ApplicationModule, InterfaceModule],
});
