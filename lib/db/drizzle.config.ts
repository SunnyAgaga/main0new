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

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
