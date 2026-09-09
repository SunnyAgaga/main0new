import { Router, type IRouter } from "express";
import { GetSiteSettingsResponse, UpdateSiteSettingsBody, UpdateSiteSettingsResponse } from "@wedplan/shared";
import { siteSettingsCollection, upsertSiteSettings, type SiteSettings } from "@/db";
import { requireAdmin } from "../middlewares/requireAuth";

const router: IRouter = Router();

function toSiteSettings(config: SiteSettings | null | undefined) {
  return {
    musicEnabled: Boolean(config?.musicEnabled),
    playlist: config?.playlist ?? [],
  };
}

router.get("/site-settings", async (_req, res): Promise<void> => {
  const config = await siteSettingsCollection().findOne({ id: 1 });
  res.json(GetSiteSettingsResponse.parse(toSiteSettings(config)));
});

router.put("/admin/site-settings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateSiteSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const config = await upsertSiteSettings({
    musicEnabled: parsed.data.musicEnabled,
    playlist: parsed.data.playlist,
  });

  req.log.info({ trackCount: config.playlist.length }, "Site settings updated");
  res.json(UpdateSiteSettingsResponse.parse(toSiteSettings(config)));
});

export default router;
