import { Router, type IRouter } from "express";
import { GetSiteSettingsResponse, UpdateSiteSettingsBody, UpdateSiteSettingsResponse } from "@wedplan/shared";
import { siteSettingsCollection, upsertSiteSettings, type SiteSettings } from "@/db";
import { requireAdmin } from "../middlewares/requireAuth";

const router: IRouter = Router();

function toSiteSettings(config: SiteSettings | null | undefined) {
  return {
    musicEnabled: Boolean(config?.musicEnabled),
    playlist: config?.playlist ?? [],
    logoUrl: config?.logoUrl ?? "",
    logoHeight: config?.logoHeight || 32,
    heroImageUrl: config?.heroImageUrl ?? "",
    backgroundColor: config?.backgroundColor || "#fdf9f3",
    primaryColor: config?.primaryColor || "#1c4d3a",
    accentColor: config?.accentColor || "#e3c878",
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

  const config = await upsertSiteSettings(parsed.data);

  req.log.info({ trackCount: config.playlist.length }, "Site settings updated");
  res.json(UpdateSiteSettingsResponse.parse(toSiteSettings(config)));
});

export default router;
