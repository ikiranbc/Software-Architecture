/**
 * Composition Root:
 * - Consumes booking-payment events and stores notification records.
 */

import {
  connectMongo,
  connectRabbit,
  consumeEvents,
  createServiceApp,
  errorHandler,
  notFoundHandler,
  startHttpServer
} from "@hotel-booking/shared-utils";
import { EventTypes } from "@hotel-booking/event-contracts";
import notificationRoutes from "./routes/notification.routes.js";
import { handlePaymentEvent } from "./services/notification.service.js";

const app = createServiceApp("notification-service");
app.use(notificationRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

await connectMongo("notification-service");
const rabbit = await connectRabbit("notification-service");
await consumeEvents(
  rabbit.channel,
  "notification-service.payments",
  [EventTypes.PAYMENT_SUCCESS, EventTypes.PAYMENT_FAILED],
  handlePaymentEvent
);

startHttpServer(app, "notification-service", 4007);
