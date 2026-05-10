import { spawn } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";

const processes = [];
const colors = ["36", "35", "32", "33", "34", "31", "95"];

function ensureEnvFile() {
  if (existsSync(".env")) return;
  if (existsSync(".env.example")) {
    copyFileSync(".env.example", ".env");
    console.log("[dev] created .env from .env.example");
    return;
  }
  console.log("[dev] warning: .env file is missing and no .env.example was found");
}

ensureEnvFile();

const gatewayPort = process.env.GATEWAY_PORT || "8790";

const sharedEnv = {
  ...process.env,
  HOST: process.env.HOST || "127.0.0.1",
  JWT_SECRET: process.env.JWT_SECRET || "local-dev-secret",
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/hotel_booking",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  RABBITMQ_URL: process.env.RABBITMQ_URL || "amqp://localhost:5672",
  GATEWAY_PORT: gatewayPort,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || `http://localhost:${gatewayPort}`,
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || "http://localhost:4001",
  USER_SERVICE_URL: process.env.USER_SERVICE_URL || "http://localhost:4002",
  HOTEL_SERVICE_URL: process.env.HOTEL_SERVICE_URL || "http://localhost:4003",
  BOOKING_SERVICE_URL: process.env.BOOKING_SERVICE_URL || "http://localhost:4004",
  WALLET_SERVICE_URL: process.env.WALLET_SERVICE_URL || "http://localhost:4005",
  ADMIN_SERVICE_URL: process.env.ADMIN_SERVICE_URL || "http://localhost:4006",
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4007"
};

const workspaces = [
  ["auth", "services/auth-service"],
  ["user", "services/user-service"],
  ["hotel", "services/hotel-service"],
  ["booking", "services/booking-service"],
  ["wallet", "services/wallet-service"],
  ["admin", "services/admin-service"],
  ["notification", "services/notification-service"],
  ["gateway", "apps/api-gateway"],
  ["client", "apps/client"]
];

function prefix(name, index, data) {
  const color = colors[index % colors.length];
  const lines = data.toString().split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    console.log(`\x1b[${color}m[${name}]\x1b[0m ${line}`);
  }
}

function run(name, command, args, options = {}) {
  const child = spawn(command, args, {
    env: sharedEnv,
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  });
  const index = processes.length;
  processes.push(child);
  child.stdout.on("data", (data) => prefix(name, index, data));
  child.stderr.on("data", (data) => prefix(name, index, data));
  child.on("exit", (code, signal) => {
    if (signal) return;
    if (code !== 0) console.log(`[${name}] exited with code ${code}`);
  });
  return child;
}

async function runOnce(name, command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { env: sharedEnv, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (data) => prefix(name, 0, data));
    child.stderr.on("data", (data) => prefix(name, 0, data));
    child.on("exit", (code) => resolve(code));
  });
}

function shutdown() {
  for (const child of processes) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

if (process.env.NO_DOCKER_INFRA !== "1") {
  console.log("[dev] starting MongoDB, Redis, and RabbitMQ with Docker Compose");
  const code = await runOnce("infra", "docker", ["compose", "up", "-d", "mongodb", "redis", "rabbitmq"]);
  if (code !== 0) {
    console.log("[dev] Docker infra startup failed, so the app was not launched.");
    console.log("[dev] Start Docker Desktop and run npm start again.");
    console.log("[dev] If MongoDB, Redis, and RabbitMQ are already running locally, use NO_DOCKER_INFRA=1 npm start.");
    process.exit(1);
  }
}

if (process.env.SKIP_DEV_SEED !== "1") {
  console.log("[dev] seeding default users and demo data");
  const seedCode = await runOnce("seed", "node", ["scripts/seed-dev-data.mjs"]);
  if (seedCode !== 0) {
    console.log("[dev] warning: seed step failed; services will still start.");
  }
}

console.log("[dev] launching services and client");
for (const [name, workspace] of workspaces) {
  run(name, "npm", ["run", "dev", "-w", workspace]);
}

console.log(`[dev] gateway: http://localhost:${gatewayPort}`);
console.log("[dev] client:  http://localhost:5173");
