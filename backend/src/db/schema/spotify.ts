import { db } from "../client";

export interface SpotifyConfig {
  id: 1;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date | null;
  connectedPlaylistId: string | null;
  connectedPlaylistName: string | null;
  updatedAt: Date;
}

export const spotifyConfigsCollection = () =>
  db.collection<SpotifyConfig>("spotify_configs");

export async function upsertSpotifyConfig(
  input: Partial<Omit<SpotifyConfig, "id" | "updatedAt">>,
): Promise<SpotifyConfig> {
  const result = await spotifyConfigsCollection().findOneAndUpdate(
    { id: 1 },
    { $set: { ...input, updatedAt: new Date() }, $setOnInsert: { id: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return result!;
}
