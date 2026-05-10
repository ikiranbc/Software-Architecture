/**
 * Composition Root:
 * - Wires infrastructure (DB, queues, messaging), routes, and middleware.
 * - Keeps object graph setup separate from business logic (Separation of Concerns).
 */

import {
  connectMongo,
  createServiceApp,
  errorHandler,
  notFoundHandler,
  startHttpServer
} from "@hotel-booking/shared-utils";
import userRoutes from "./routes/user.routes.js";

const app = createServiceApp("user-service");

app.use("/api/users", userRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

await connectMongo("user-service");
startHttpServer(app, "user-service", 4002);
