import "dotenv/config";

export function getEnv(key, required = true) {
  const value = process.env[key];

  if (required && !value) {
    throw new Error(`Missing required env: ${key}`);
  }

  return value;
}