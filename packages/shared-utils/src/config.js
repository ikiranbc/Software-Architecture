export function env(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function numberEnv(name, fallback) {
  return Number(env(name, fallback));
}
