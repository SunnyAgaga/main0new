import { Router, type IRouter } from "express";
import {
  GetNotificationConfigResponse,
  UpdateNotificationConfigBody,
  UpdateNotificationConfigResponse,
} from "@wedplan/shared";
import { notificationConfigsCollection, upsertNotificationConfig, type NotificationConfig } from "@/db";
import { requirePermission } from "../middlewares/requireAuth";

const router: IRouter = Router();

function safeNotificationConfig(config: NotificationConfig | null | undefined) {
  return {
    emailEnabled: Boolean(config?.emailEnabled),
    emailConfigured: Boolean(config?.mailgunApiKey && config.mailgunDomain),
    mailgunDomain: config?.mailgunDomain ?? "",
    mailgunFromEmail: config?.mailgunFromEmail ?? "",
    smsEnabled: Boolean(config?.smsEnabled),
    smsConfigured: Boolean(config?.twilioAccountSid && config.twilioAuthToken),
    twilioFromNumber: config?.twilioFromNumber ?? "",
  };
}

router.get("/admin/notification-config", requirePermission("notifications"), async (_req, res): Promise<void> => {
  const config = await notificationConfigsCollection().findOne({ id: 1 });
  res.json(GetNotificationConfigResponse.parse(safeNotificationConfig(config)));
});

router.put("/admin/notification-config", requirePermission("notifications"), async (req, res): Promise<void> => {
  const parsed = UpdateNotificationConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await notificationConfigsCollection().findOne({ id: 1 });
  const mailgunApiKey = parsed.data.mailgunApiKey.trim() || existing?.mailgunApiKey || "";
  const twilioAccountSid = parsed.data.twilioAccountSid.trim() || existing?.twilioAccountSid || "";
  const twilioAuthToken = parsed.data.twilioAuthToken.trim() || existing?.twilioAuthToken || "";

  const config = await upsertNotificationConfig({
    emailEnabled: parsed.data.emailEnabled,
    mailgunApiKey,
    mailgunDomain: parsed.data.mailgunDomain.trim(),
    mailgunFromEmail: parsed.data.mailgunFromEmail.trim(),
    smsEnabled: parsed.data.smsEnabled,
    twilioAccountSid,
    twilioAuthToken,
    twilioFromNumber: parsed.data.twilioFromNumber.trim(),
  });

  req.log.info("Notification configuration updated");
  res.json(UpdateNotificationConfigResponse.parse(safeNotificationConfig(config)));
});

export default router;
