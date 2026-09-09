import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Production runs behind a reverse proxy that terminates TLS and forwards
// plain HTTP internally. Without this, req.protocol always reports "http"
// (from X-Forwarded-Proto being ignored), which leaks into every absolute
// URL this app generates - Spotify's redirect_uri, payment webhook URLs,
// checkout return URLs - as the wrong scheme.
app.set("trust proxy", 1);

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
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", router);

// Serve the built frontend from this same process, so the whole app runs on one
// port behind one domain. In development Vite serves the SPA instead and proxies
// /api here, so this block is simply skipped when the build is absent.
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const clientDist =
  process.env.CLIENT_DIST ??
  path.resolve(serverDir, "..", "..", "frontend", "dist", "public");

if (existsSync(path.join(clientDist, "index.html"))) {
  // Static first (this also serves index.html at "/"), then an SPA fallback for
  // client-side routes. Note: Express 5 throws on app.get("*"), and "/*splat"
  // does not match "/" - a plain middleware avoids both traps.
  app.use(express.static(clientDist));

  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      next();
      return;
    }

    res.sendFile(path.join(clientDist, "index.html"), (error) => {
      if (error) next(error);
    });
  });

  logger.info({ clientDist }, "Serving frontend build");
} else {
  logger.warn({ clientDist }, "No frontend build found; serving API only");
}

export default app;
