import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { eventDetailsCollection, siteSettingsCollection, DEFAULT_EVENT_DETAILS } from "@/db";

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function replaceMetaContent(html: string, selector: RegExp, content: string): string {
  return html.replace(selector, `$1${escapeHtml(content)}$2`);
}

/**
 * Link-preview crawlers (WhatsApp, iMessage, etc.) fetch this HTML directly and
 * never run the SPA's JS, so the couple's real name has to already be baked into
 * the tags server-side - the build-time placeholders in index.html are just a
 * fallback for when event details haven't been set yet.
 */
async function renderIndexHtml(req: { protocol: string; get(name: string): string | undefined }): Promise<string> {
  const template = await readFile(path.join(clientDist, "index.html"), "utf-8");
  const [details, settings] = await Promise.all([
    eventDetailsCollection().findOne({ id: 1 }),
    siteSettingsCollection().findOne({ id: 1 }),
  ]);

  const coupleNames = details?.coupleNames || DEFAULT_EVENT_DETAILS.coupleNames;
  const title = `${coupleNames} — Wedding`;
  const description = `RSVP for ${coupleNames}'s wedding, choose your asoebi, and send a gift.`;
  const rawImage = settings?.heroImageUrl || settings?.logoUrl || "";
  const imageUrl = rawImage
    ? rawImage.startsWith("http")
      ? rawImage
      : `${req.protocol}://${req.get("host")}${rawImage}`
    : "";

  let html = template;
  html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = replaceMetaContent(html, /(<meta name="description" content=")[^"]*("\s*\/?>)/, description);
  html = replaceMetaContent(html, /(<meta property="og:title" content=")[^"]*("\s*\/?>)/, title);
  html = replaceMetaContent(html, /(<meta property="og:description" content=")[^"]*("\s*\/?>)/, description);
  html = replaceMetaContent(html, /(<meta name="twitter:title" content=")[^"]*("\s*\/?>)/, title);
  html = replaceMetaContent(html, /(<meta name="twitter:description" content=")[^"]*("\s*\/?>)/, description);
  if (imageUrl) {
    html = html.replace(
      "</head>",
      `<meta property="og:image" content="${escapeHtml(imageUrl)}" /><meta name="twitter:image" content="${escapeHtml(imageUrl)}" /></head>`,
    );
  }

  return html;
}

if (existsSync(path.join(clientDist, "index.html"))) {
  // Static first for real assets (JS/CSS/images), but not index.html itself -
  // that goes through renderIndexHtml below so its meta tags stay live. Note:
  // Express 5 throws on app.get("*"), and "/*splat" does not match "/" - a
  // plain middleware avoids both traps for the SPA fallback.
  app.use(express.static(clientDist, { index: false }));

  app.use(async (req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      next();
      return;
    }

    try {
      const html = await renderIndexHtml(req);
      res.set("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      next(error);
    }
  });

  logger.info({ clientDist }, "Serving frontend build");
} else {
  logger.warn({ clientDist }, "No frontend build found; serving API only");
}

export default app;
