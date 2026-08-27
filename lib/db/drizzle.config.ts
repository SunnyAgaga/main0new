import { defineConfig } from "drizzle-kit";
import path from "path";

// drizzle-kit does not read .env on its own. Load the workspace .env so
// schema pushes work without exporting DATABASE_URL first. Real environment
// variables still win, so CI and hosts can inject their own.
try {
  process.loadEnvFile(path.join(__dirname, "../../.env"));
} catch {
  // No .env file - rely on the real environment.
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const databaseUrl = process.env.DATABASE_URL;

// Managed Postgres providers (DigitalOcean, Heroku, RDS...) present a cert
// signed by their own CA, which Node does not trust by default. drizzle-kit
// does not honour `sslmode`/`uselibpqcompat` from the URL, so set ssl here.
// Only applied when the URL asks for SSL, so local Postgres is unaffected.
const wantsSsl = /[?&]sslmode=(require|prefer|verify-ca|verify-full)/.test(databaseUrl);

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    ...(wantsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  },
});
