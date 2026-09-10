import { randomBytes } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import {
  GetSpotifyConfigResponse,
  ListSpotifyPlaylistsResponse,
  UpdateSpotifyConfigBody,
  UpdateSpotifyConfigResponse,
} from "@wedplan/shared";
import {
  spotifyConfigsCollection,
  upsertSpotifyConfig,
  upsertSiteSettings,
  siteSettingsCollection,
  type SpotifyConfig,
} from "@/db";
import { requirePermission } from "../middlewares/requireAuth";

const router: IRouter = Router();

const STATE_COOKIE_NAME = "spotify_oauth_state";
const SPOTIFY_SCOPES = "playlist-read-private playlist-read-collaborative";

function getRedirectUri(req: Request): string {
  // Dev runs Vite (FRONTEND_PORT) and the backend (PORT) separately, with Vite
  // proxying /api to the backend. Spotify must redirect the browser to the
  // Vite origin so the round trip goes back through that proxy. In production
  // the backend serves the frontend itself, so req's own host is correct.
  if (process.env.NODE_ENV !== "production" && process.env.FRONTEND_PORT) {
    return `${req.protocol}://${req.hostname}:${process.env.FRONTEND_PORT}/api/spotify/callback`;
  }
  return `${req.protocol}://${req.get("host")}/api/spotify/callback`;
}

function toSpotifyConfig(config: SpotifyConfig | null | undefined, redirectUri: string) {
  return {
    configured: Boolean(config?.clientId && config.clientSecret),
    connected: Boolean(config?.accessToken && config.refreshToken),
    redirectUri,
    connectedPlaylistName: config?.connectedPlaylistName ?? null,
  };
}

async function getValidAccessToken(config: SpotifyConfig): Promise<string | null> {
  if (!config.accessToken || !config.refreshToken) return null;

  const isExpired =
    !config.tokenExpiresAt || config.tokenExpiresAt.getTime() < Date.now() + 60_000;
  if (!isExpired) return config.accessToken;

  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: config.refreshToken,
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  await upsertSpotifyConfig({
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? config.refreshToken,
    tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
  });

  return data.access_token;
}

router.get("/admin/spotify-config", requirePermission("music"), async (req, res): Promise<void> => {
  const config = await spotifyConfigsCollection().findOne({ id: 1 });
  res.json(GetSpotifyConfigResponse.parse(toSpotifyConfig(config, getRedirectUri(req))));
});

router.put("/admin/spotify-config", requirePermission("music"), async (req, res): Promise<void> => {
  const parsed = UpdateSpotifyConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const config = await upsertSpotifyConfig({
    clientId: parsed.data.clientId.trim(),
    clientSecret: parsed.data.clientSecret.trim(),
  });

  req.log.info("Spotify app credentials saved");
  res.json(UpdateSpotifyConfigResponse.parse(toSpotifyConfig(config, getRedirectUri(req))));
});

router.get("/admin/spotify/connect", requirePermission("music"), async (req, res): Promise<void> => {
  const config = await spotifyConfigsCollection().findOne({ id: 1 });
  if (!config?.clientId) {
    res.status(400).json({ error: "Save your Spotify Client ID and Secret first." });
    return;
  }

  const state = randomBytes(16).toString("hex");
  res.cookie(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: getRedirectUri(req),
    scope: SPOTIFY_SCOPES,
    state,
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

router.get("/spotify/callback", requirePermission("music"), async (req, res): Promise<void> => {
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;
  const expectedState = req.cookies?.[STATE_COOKIE_NAME];
  res.clearCookie(STATE_COOKIE_NAME);

  if (!code || !state || state !== expectedState) {
    res.redirect("/dashboard/music?spotify=error");
    return;
  }

  const config = await spotifyConfigsCollection().findOne({ id: 1 });
  if (!config?.clientId || !config.clientSecret) {
    res.redirect("/dashboard/music?spotify=error");
    return;
  }

  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(req),
    }),
  });

  if (!response.ok) {
    req.log.warn({ status: response.status }, "Spotify token exchange failed");
    res.redirect("/dashboard/music?spotify=error");
    return;
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await upsertSpotifyConfig({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
  });

  req.log.info("Spotify account connected");
  res.redirect("/dashboard/music?spotify=connected");
});

router.get("/admin/spotify/playlists", requirePermission("music"), async (req, res): Promise<void> => {
  const config = await spotifyConfigsCollection().findOne({ id: 1 });
  if (!config) {
    res.status(503).json({ error: "Spotify is not connected." });
    return;
  }

  const accessToken = await getValidAccessToken(config);
  if (!accessToken) {
    res.status(503).json({ error: "Spotify is not connected." });
    return;
  }

  const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    res.status(503).json({ error: "Could not reach Spotify." });
    return;
  }

  const data = (await response.json()) as {
    items: { id: string; name: string; tracks: { total: number } }[];
  };

  res.json(
    ListSpotifyPlaylistsResponse.parse(
      data.items.map((item) => ({
        id: item.id,
        name: item.name,
        trackCount: item.tracks.total,
      })),
    ),
  );
});

router.post(
  "/admin/spotify/import/:playlistId",
  requirePermission("music"),
  async (req, res): Promise<void> => {
    const { playlistId } = req.params;

    const config = await spotifyConfigsCollection().findOne({ id: 1 });
    if (!config) {
      res.status(503).json({ error: "Spotify is not connected." });
      return;
    }

    const accessToken = await getValidAccessToken(config);
    if (!accessToken) {
      res.status(503).json({ error: "Spotify is not connected." });
      return;
    }

    const playlistResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}?fields=name`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!playlistResponse.ok) {
      res.status(404).json({ error: "Playlist not found." });
      return;
    }
    const playlist = (await playlistResponse.json()) as { name: string };

    const tracks: { title: string; url: string }[] = [];
    let next: string | null =
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=next,items(track(name,preview_url,artists(name)))`;

    while (next) {
      const tracksResponse: Response = await fetch(next, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!tracksResponse.ok) break;

      const page = (await tracksResponse.json()) as {
        next: string | null;
        items: {
          track: { name: string; preview_url: string | null; artists: { name: string }[] } | null;
        }[];
      };

      for (const { track } of page.items) {
        if (track?.preview_url) {
          const artist = track.artists[0]?.name ?? "";
          tracks.push({
            title: artist ? `${track.name} — ${artist}` : track.name,
            url: track.preview_url,
          });
        }
      }

      next = page.next;
    }

    await upsertSpotifyConfig({
      connectedPlaylistId: String(playlistId),
      connectedPlaylistName: playlist.name,
    });

    const settings = await upsertSiteSettings({
      musicEnabled: tracks.length > 0,
      playlist: tracks,
    });

    req.log.info(
      { playlistId, trackCount: tracks.length },
      "Imported Spotify playlist previews",
    );
    res.json(settings);
  },
);

// Keep the public site-settings shape consistent even though this route
// doesn't touch it directly — re-exported here so callers only need one import.
export { siteSettingsCollection };
export default router;
