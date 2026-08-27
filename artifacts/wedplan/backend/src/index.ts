import app from "./app";
import { logger } from "./lib/logger";
import {
  closeMongoConnection,
  initializeMongoDatabase,
} from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start(): Promise<void> {
  await initializeMongoDatabase();

  const server = app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });

  const shutdown = (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Shutting down server");
    server.close(() => {
      closeMongoConnection()
        .catch((error: unknown) => {
          logger.error({ err: error }, "Could not close MongoDB connection");
        })
        .finally(() => process.exit(0));
    });
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

start().catch((error: unknown) => {
  logger.error({ err: error }, "Could not initialize MongoDB");
  process.exit(1);
});
