import { Router, type IRouter } from "express";
import {
  GetNotificationConfigResponse,
  UpdateNotificationConfigBody,
  UpdateNotificationConfigResponse,
  SendTestEmailBody,
  SendTestEmailResponse,
} from "@wedplan/shared";
import { notificationConfigsCollection, upsertNotificationConfig, type NotificationConfig } from "@/db";
import { requirePermission } from "../middlewares/requireAuth";
import { sendSmtpEmail } from "@/lib/email";

const router: IRouter = Router();

function safeNotificationConfig(config: NotificationConfig | null | undefined) {
  return {
    emailEnabled: Boolean(config?.emailEnabled),
    emailConfigured: Boolean(config?.smtpHost && config.smtpUsername && config.smtpPassword),
    smtpHost: config?.smtpHost ?? "",
    smtpPort: config?.smtpPort ?? 587,
    smtpUsername: config?.smtpUsername ?? "",
    smtpFromEmail: config?.smtpFromEmail ?? "",
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
  const smtpPassword = parsed.data.smtpPassword.trim() || existing?.smtpPassword || "";
  const twilioAccountSid = parsed.data.twilioAccountSid.trim() || existing?.twilioAccountSid || "";
  const twilioAuthToken = parsed.data.twilioAuthToken.trim() || existing?.twilioAuthToken || "";

  const config = await upsertNotificationConfig({
    emailEnabled: parsed.data.emailEnabled,
    smtpHost: parsed.data.smtpHost.trim(),
    smtpPort: parsed.data.smtpPort,
    smtpUsername: parsed.data.smtpUsername.trim(),
    smtpPassword,
    smtpFromEmail: parsed.data.smtpFromEmail.trim(),
    smsEnabled: parsed.data.smsEnabled,
    twilioAccountSid,
    twilioAuthToken,
    twilioFromNumber: parsed.data.twilioFromNumber.trim(),
  });

  req.log.info("Notification configuration updated");
  res.json(UpdateNotificationConfigResponse.parse(safeNotificationConfig(config)));
});

router.post("/admin/notification-config/test-email", requirePermission("notifications"), async (req, res): Promise<void> => {
  const parsed = SendTestEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const config = await notificationConfigsCollection().findOne({ id: 1 });
  if (!config?.emailEnabled || !config.smtpHost || !config.smtpUsername || !config.smtpPassword || !config.smtpFromEmail) {
    res.status(503).json({ error: "Email has not been configured yet." });
    return;
  }

  const delivered = await sendSmtpEmail({
    host: config.smtpHost,
    port: config.smtpPort,
    username: config.smtpUsername,
    password: config.smtpPassword,
    from: config.smtpFromEmail,
    to: parsed.data.to.trim(),
    subject: "WedPlan test email",
    text: "This is a test email from your WedPlan dashboard. If you received this, your SMTP configuration is working.",
  });

  req.log.info({ to: parsed.data.to, delivered }, "Test email sent");
  res.json(SendTestEmailResponse.parse({ delivered }));
});

export default router;
