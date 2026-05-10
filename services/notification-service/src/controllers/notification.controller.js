import * as notificationService from "../services/notification.service.js";

export async function listRecentNotifications(req, res) {
  const payload = await notificationService.listRecentNotifications(req.query.limit);
  res.json(payload);
}
