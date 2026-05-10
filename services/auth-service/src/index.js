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
import authRoutes from "./routes/auth.routes.js";
import { ensureDevUsersActive } from "./bootstrap/dev-users.bootstrap.js";

const app = createServiceApp("auth-service");

app.use("/api/auth", authRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

await connectMongo("auth-service");
await ensureDevUsersActive();
startHttpServer(app, "auth-service", 4001);
