/**
 * Shared HTTP Utilities (Shared Kernel / Utility Facade):
 * - Provides standardized service bootstrap and error handling primitives.
 * - Promotes consistency across microservices.
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env, numberEnv } from "./config.js";

export function createServiceApp(serviceName) {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ service: serviceName, status: "ok" });
  });

  return app;
}

export function startHttpServer(app, serviceName, defaultPort) {
  const host = env("HOST", "127.0.0.1");
  const port = numberEnv("PORT", defaultPort);
  const server = app.listen(port, host, () => {
    console.log(`${serviceName} listening on http://${host}:${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`${serviceName} could not start because ${host}:${port} is already in use`);
    } else if (error.code === "EACCES" || error.code === "EPERM") {
      console.error(`${serviceName} could not start due to insufficient permissions for ${host}:${port}`);
    } else {
      console.error(`${serviceName} failed to start`, error);
    }
    process.exit(1);
  });

  return server;
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `No route for ${req.method} ${req.originalUrl}`
  });
}

export function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: err.code || "INTERNAL_ERROR",
    message: err.message || "Something went wrong"
  });
}

export function httpError(statusCode, message, code = "REQUEST_ERROR") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
