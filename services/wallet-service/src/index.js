/**
 * Composition Root:
 * - Wires infrastructure (DB, queues, messaging), routes, and middleware.
 * - Keeps object graph setup separate from business logic (Separation of Concerns).
 */

import { Queue, Worker } from "bullmq";
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
import walletRoutes from "./routes/wallet.routes.js";
import {
  bullConnection,
  handleBookingCreated,
  setPaymentEventChannel
} from "./services/payment-processor.service.js";

const app = createServiceApp("wallet-service");

app.use(walletRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

await connectMongo("wallet-service");
const rabbit = await connectRabbit("wallet-service");
setPaymentEventChannel(rabbit.channel);

const paymentQueue = new Queue("wallet-payment-processing", { connection: bullConnection() });
new Worker("wallet-payment-processing", (job) => handleBookingCreated(job.data), {
  connection: bullConnection(),
  concurrency: 5
});

function isDuplicateQueueJobError(error) {
  const message = String(error?.message || "");
  return message.includes("already exists") || message.includes("Job is already waiting");
}

async function enqueuePaymentJob(event) {
  try {
    await paymentQueue.add(event.bookingId, event, {
      jobId: event.idempotencyKey,
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86_400 }
    });
  } catch (error) {
    // Duplicate delivery can happen in event-driven systems; idempotent jobId makes this safe to ignore.
    if (isDuplicateQueueJobError(error)) return;
    throw error;
  }
}

await consumeEvents(rabbit.channel, "wallet-service.bookings", [EventTypes.BOOKING_CREATED], async (event) => {
  await enqueuePaymentJob(event);
});

startHttpServer(app, "wallet-service", 4005);
