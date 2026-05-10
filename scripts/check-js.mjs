import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["apps/api-gateway/src", "services", "packages"];
const extraFiles = ["apps/client/dev.mjs", "scripts/dev.mjs", "scripts/check-js.mjs", "scripts/seed-dev-data.mjs"];
const files = [];

function walk(dir) {
  for (const item of readdirSync(dir)) {
    const path = join(dir, item);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    if (stat.isFile() && path.endsWith(".js")) files.push(path);
    if (stat.isFile() && path.endsWith(".mjs")) files.push(path);
  }
}

for (const root of roots) {
  if (existsSync(root)) walk(root);
}

for (const file of extraFiles) {
  if (existsSync(file)) files.push(file);
}

let failed = false;
for (const file of files) {
  const result = spawnSync("node", ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) failed = true;
}

if (failed) process.exit(1);
console.log(`Checked ${files.length} JavaScript files.`);
