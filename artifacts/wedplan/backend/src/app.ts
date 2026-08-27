import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
const backendDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDistDir = path.resolve(backendDir, "..", "..", "frontend", "dist", "public");
const frontendIndex = path.join(frontendDistDir, "index.html");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// The backend owns the browser-facing process in both preview and production.
// Static assets are served first, then unknown browser routes fall back to the
// SPA entrypoint without intercepting API requests.
app.use(express.static(frontendDistDir));
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) {
    next();
    return;
  }

  res.sendFile(frontendIndex, (error) => {
    if (error) next(error);
  });
});

export default app;
