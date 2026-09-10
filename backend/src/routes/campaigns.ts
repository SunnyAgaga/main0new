import { Router, type IRouter } from "express";
import { ListCampaignsResponse, SendCampaignBody, SendCampaignResponse } from "@wedplan/shared";
import {
  insertCampaign,
  listCampaigns,
  notificationConfigsCollection,
  rsvpsCollection,
  type NotificationConfig,
} from "@/db";
import { requirePermission } from "../middlewares/requireAuth";
import { sendMailgunEmail } from "@/lib/mailgun";

const router: IRouter = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailConfigured(config: NotificationConfig | null): config is NotificationConfig {
  return Boolean(
    config?.emailEnabled &&
      config.mailgunApiKey &&
      config.mailgunDomain &&
      config.mailgunFromEmail,
  );
}

async function sendInBatches(
  emails: string[],
  sendOne: (email: string) => Promise<boolean>,
  batchSize = 5,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(sendOne));
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) sent++;
      else failed++;
    }
  }

  return { sent, failed };
}

router.get("/admin/campaigns", requirePermission("campaigns"), async (_req, res): Promise<void> => {
  const campaigns = await listCampaigns();
  res.json(
    ListCampaignsResponse.parse(
      campaigns.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
    ),
  );
});

router.post("/admin/campaigns", requirePermission("campaigns"), async (req, res): Promise<void> => {
  const parsed = SendCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const config = await notificationConfigsCollection().findOne({ id: 1 });
  if (!emailConfigured(config)) {
    res.status(503).json({ error: "Email has not been configured yet." });
    return;
  }

  const rsvps =
    parsed.data.rsvpIds.length > 0
      ? await rsvpsCollection()
          .find({ id: { $in: parsed.data.rsvpIds } })
          .toArray()
      : [];

  const recipients = new Set<string>();
  for (const rsvp of rsvps) {
    if (EMAIL_PATTERN.test(rsvp.email)) recipients.add(rsvp.email.trim().toLowerCase());
  }
  for (const email of parsed.data.extraEmails) {
    const trimmed = email.trim().toLowerCase();
    if (EMAIL_PATTERN.test(trimmed)) recipients.add(trimmed);
  }

  if (recipients.size === 0) {
    res.status(400).json({ error: "No valid recipients were selected." });
    return;
  }

  const { sent, failed } = await sendInBatches(Array.from(recipients), (to) =>
    sendMailgunEmail({
      apiKey: config.mailgunApiKey,
      domain: config.mailgunDomain,
      from: config.mailgunFromEmail,
      to,
      subject: parsed.data.subject,
      text: parsed.data.message,
    }),
  );

  const campaign = await insertCampaign({
    subject: parsed.data.subject,
    message: parsed.data.message,
    recipientCount: recipients.size,
    sentCount: sent,
    failedCount: failed,
  });

  req.log.info(
    { campaignId: campaign.id, recipientCount: recipients.size, sent, failed },
    "Email campaign sent",
  );
  res.status(201).json(
    SendCampaignResponse.parse({ ...campaign, createdAt: campaign.createdAt.toISOString() }),
  );
});

export default router;
