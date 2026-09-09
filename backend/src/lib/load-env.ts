import path from "node:path";
import { fileURLToPath } from "node:url";

// Load the .env before anything reads process.env, so the server works however
// it is started - npm script, pm2, systemd, docker - with no --env-file flag.
//
// Must be imported before ./app: ESM evaluates imports in order, and ./app
// pulls in the db client, which reads MONGODB_URI at module load.
//
// process.loadEnvFile never overwrites a variable that is already set, so real
// environment variables (and whatever the host injects) always win.
const here = path.dirname(fileURLToPath(import.meta.url));

const candidates = [
  process.env.ENV_FILE,                            // explicit override
  path.resolve(here, "..", "..", ".env"),          // repo root (from backend/dist)
  path.resolve(here, "..", "..", "..", ".env"),    // repo root (from backend/src/lib)
  path.resolve(process.cwd(), ".env"),
];

for (const candidate of candidates) {
  if (!candidate) continue;
  try {
    process.loadEnvFile(candidate);
  } catch {
    // Not present or unreadable - try the next one.
  }
}
