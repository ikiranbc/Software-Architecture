/**
 * Composition Root:
 * - Wires infrastructure (DB, queues, messaging), routes, and middleware.
 * - Keeps object graph setup separate from business logic (Separation of Concerns).
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
import bookingRoutes from "./routes/booking.routes.js";
import { handlePaymentEvent, setBookingEventChannel } from "./services/booking.service.js";

const app = createServiceApp("booking-service");

app.use(bookingRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

await connectMongo("booking-service");
const rabbit = await connectRabbit("booking-service");
setBookingEventChannel(rabbit.channel);
await consumeEvents(rabbit.channel, "booking-service.payments", [EventTypes.PAYMENT_SUCCESS, EventTypes.PAYMENT_FAILED], handlePaymentEvent);
startHttpServer(app, "booking-service", 4004);
