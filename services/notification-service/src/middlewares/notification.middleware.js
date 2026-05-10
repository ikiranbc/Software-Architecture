export function normalizeNotificationQuery(req, _res, next) {
  if (typeof req.query.limit === "string") {
    req.query.limit = req.query.limit.trim();
  }
  next();
}
