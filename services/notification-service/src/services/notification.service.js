import {
  EventTypes,
  paymentFailedSchema,
  paymentSuccessSchema
} from "@hotel-booking/event-contracts";
import { createNotification, listNotifications } from "../repositories/notification.repository.js";

export async function handlePaymentEvent(event) {
  if (event.eventType === EventTypes.PAYMENT_SUCCESS) {
    const parsed = paymentSuccessSchema.parse(event);
    await createNotification({
      bookingId: parsed.bookingId,
      eventType: parsed.eventType,
      title: "Your booking is confirmed!",
      message: "Payment completed successfully and booking was confirmed.",
      payload: parsed,
      delivered: true
    });
    return;
  }

  if (event.eventType === EventTypes.PAYMENT_FAILED) {
    const parsed = paymentFailedSchema.parse(event);
    await createNotification({
      bookingId: parsed.bookingId,
      eventType: parsed.eventType,
      title: "Payment Failed",
      message: `Booking payment failed: ${parsed.reasonCode}`,
      payload: parsed,
      delivered: true
    });
  }
}

export async function listRecentNotifications(limit = 50) {
  const items = await listNotifications(limit);
  return {
    data: items.map((item) => ({
      id: item._id.toString(),
      userId: item.userId?.toString(),
      bookingId: item.bookingId?.toString(),
      eventType: item.eventType,
      title: item.title,
      message: item.message,
      payload: item.payload,
      delivered: item.delivered,
      createdAt: item.createdAt
    }))
  };
}
