import { spawn } from "node:child_process";

// Use localhost to catch IPv4/IPv6 port conflicts and avoid split listeners
// (for example stale Docker UI on ::1 while Vite binds only to 127.0.0.1).
const host = process.env.HOST || "localhost";
const child = spawn("npm", ["exec", "vite", "--", "--host", host, "--strictPort"], { stdio: "inherit" });

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
