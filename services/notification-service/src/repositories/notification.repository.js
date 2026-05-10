import { Notification } from "../models/notification.model.js";

export function createNotification(payload) {
  return Notification.create(payload);
}

export function listNotifications(limit = 50) {
  return Notification.find({}).sort({ createdAt: -1 }).limit(limit);
}
