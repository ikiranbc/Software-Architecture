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
import hotelRoutes from "./routes/hotel.routes.js";

const app = createServiceApp("hotel-service");

app.use(hotelRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

await connectMongo("hotel-service");
startHttpServer(app, "hotel-service", 4003);
