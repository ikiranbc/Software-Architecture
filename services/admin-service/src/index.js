/**
 * Composition Root:
 * - Wires admin/superadmin APIs.
 */

import {
  connectMongo,
  createServiceApp,
  errorHandler,
  notFoundHandler,
  startHttpServer
} from "@hotel-booking/shared-utils";
import adminRoutes from "./routes/admin.routes.js";

const app = createServiceApp("admin-service");

app.use(adminRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

await connectMongo("admin-service");
startHttpServer(app, "admin-service", 4006);
