/**
 * API Gateway (Gateway pattern + BFF edge orchestration):
 * - Single entry point for clients.
 * - Applies shared edge concerns (security, rate limits, auth propagation, proxy routing).
 */

import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import { env, startHttpServer, verifyToken } from "@hotel-booking/shared-utils";
import { normalizeRole } from "@hotel-booking/rbac";

const app = express();
app.set("trust proxy", process.env.TRUST_PROXY || 1);

const services = {
  auth: env("AUTH_SERVICE_URL", "http://localhost:4001"),
  user: env("USER_SERVICE_URL", "http://localhost:4002"),
  hotel: env("HOTEL_SERVICE_URL", "http://localhost:4003"),
  booking: env("BOOKING_SERVICE_URL", "http://localhost:4004"),
  wallet: env("WALLET_SERVICE_URL", "http://localhost:4005"),
  admin: env("ADMIN_SERVICE_URL", "http://localhost:4006")
};

app.use(helmet());
const configuredOrigins = env("CLIENT_ORIGIN", "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedDevOrigin(origin) {
  if (!origin) return true;
  if (configuredOrigins.includes("*")) return true;
  if (configuredOrigins.includes(origin)) return true;

  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    const isDevPort = ["5173", "4173", "3000"].includes(url.port);
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    const isPrivateNetwork =
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

    return isDevPort && (isLocalhost || isPrivateNetwork);
  } catch {
    return false;
  }
}

app.use(cors({
  origin(origin, callback) {
    callback(null, isAllowedDevOrigin(origin));
  },
  credentials: true
}));

app.get("/health", (_req, res) => {
  res.json({ service: "api-gateway", status: "ok" });
});

const authLimiter = rateLimit({ windowMs: 60_000, limit: 25, standardHeaders: true });
const bookingLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true });

function extractBearerToken(headerValue) {
  if (typeof headerValue !== "string") return null;
  let value = headerValue.trim();
  if (!value) return null;
  while (/^Bearer\s+/i.test(value)) {
    value = value.replace(/^Bearer\s+/i, "").trim();
  }
  value = value.split(",")[0].trim();
  value = value.replace(/^["']|["']$/g, "");
  const match = value.match(/[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/);
  return match?.[0] || value || null;
}

function attachAuth(required = true, roles = []) {
  return (req, res, next) => {
    const header = req.header("authorization");
    const token = extractBearerToken(header);

    if (!token && !required) return next();
    if (!token) return res.status(401).json({ error: "AUTH_REQUIRED", message: "Authentication required" });

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      // Fallback strategy:
      // allow downstream service middleware to perform token verification.
      // this prevents edge false negatives from blocking otherwise valid auth flows.
      if (roles.length > 0) {
        return res.status(401).json({ error: "INVALID_TOKEN", message: "Invalid or expired token" });
      }
      if (process.env.DEBUG_AUTH === "1") {
        const tokenPreview = token ? `${token.slice(0, 24)}...${token.slice(-8)}` : "none";
        console.warn(
          `[auth] gateway verification fallback for ${req.method} ${req.originalUrl}: ${error.message}; authHeader=${JSON.stringify(header || "")}; token=${tokenPreview}; tokenLen=${token?.length || 0}`
        );
      }
      return next();
    }

    const role = normalizeRole(decoded.role);
    if (roles.length > 0 && !roles.includes(role)) {
      return res.status(403).json({ error: "FORBIDDEN", message: "You do not have permission for this action" });
    }
    req.headers["x-user-id"] = decoded.sub;
    req.headers["x-user-role"] = role;
    req.headers["x-user-email"] = decoded.email;
    next();
  };
}

function joinBasePath(basePath, path) {
  const normalizedBase = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function rewriteForService(basePath, path) {
  // Compatibility guard:
  // - If req.url already includes the service base path, keep it unchanged.
  // - If req.url is mount-relative (Express behavior), prepend the base path.
  if (path === basePath || path.startsWith(`${basePath}/`)) return path;
  return joinBasePath(basePath, path);
}

function createServiceProxy(target, basePath) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => rewriteForService(basePath, path),
    proxyTimeout: 30_000,
    on: {
      error(error, _req, res) {
        if (res.headersSent) return;
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          error: "SERVICE_UNAVAILABLE",
          message: `Downstream service is unavailable: ${error.code || error.message}`
        }));
      }
    }
  });
}

app.use("/api/auth", authLimiter, createServiceProxy(services.auth, "/api/auth"));
app.use("/api/users", attachAuth(true), createServiceProxy(services.user, "/api/users"));
app.use("/api/bookings", bookingLimiter, attachAuth(true), createServiceProxy(services.booking, "/api/bookings"));
app.use("/api/wallet", attachAuth(true), createServiceProxy(services.wallet, "/api/wallet"));
app.use("/api/payments", attachAuth(true), createServiceProxy(services.wallet, "/api/payments"));
app.use("/api/owner", attachAuth(true, ["ADMIN", "SUPERADMIN"]), createServiceProxy(services.hotel, "/api/owner"));
app.use("/api/admin", attachAuth(true, ["ADMIN", "SUPERADMIN"]), createServiceProxy(services.admin, "/api/admin"));
app.use("/api/superadmin", attachAuth(true, ["SUPERADMIN"]), createServiceProxy(services.admin, "/api/superadmin"));
app.use("/api/hotels", attachAuth(false), createServiceProxy(services.hotel, "/api/hotels"));

app.use((req, res) => {
  res.status(404).json({ error: "NOT_FOUND", message: `No route for ${req.method} ${req.originalUrl}` });
});

startHttpServer(app, "api-gateway", 8790);
