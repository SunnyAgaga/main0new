import { Router, type IRouter } from "express";
import { GetRsvpResumeResponse, SendPaymentReminderResponse } from "@wedplan/shared";
import { findRsvpByResumeToken, getOrCreateResumeToken, rsvpsCollection } from "@/db";
import { findExistingAsoebiOrder, resolveRsvpAsoebiOrder } from "@/lib/rsvp-resume";
import { guestOrigin, sendPaymentReminderEmail } from "@/lib/rsvp-emails";
import { requirePermission } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/rsvp-resume/:token", async (req, res): Promise<void> => {
  const rsvp = await findRsvpByResumeToken(String(req.params.token));
  if (!rsvp) {
    res.status(404).json({ error: "Resume link not found." });
    return;
  }

  const { items, totalAmount, currency } = await resolveRsvpAsoebiOrder(rsvp);
  const existingOrder = await findExistingAsoebiOrder(rsvp.id);

  res.json(
    GetRsvpResumeResponse.parse({
      rsvpId: rsvp.id,
      guestName: rsvp.guestName,
      email: rsvp.email,
      items,
      totalAmount,
      currency,
      existingOrderReference: existingOrder?.reference ?? null,
      existingOrderStatus: existingOrder?.status ?? null,
    }),
  );
});

router.post("/admin/rsvps/:id/payment-reminder", requirePermission("rsvps"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid RSVP id." });
    return;
  }

  const rsvp = await rsvpsCollection().findOne({ id });
  if (!rsvp) {
    res.status(404).json({ error: "RSVP not found." });
    return;
  }

  const token = await getOrCreateResumeToken(id);
  if (!token) {
    res.status(400).json({ error: "This guest has no Aso Ebi interest to remind about." });
    return;
  }

  const basePath = (process.env.WEDPLAN_BASE_PATH ?? "").replace(/\/$/, "");
  const resumeUrl = `${guestOrigin(req)}${basePath}/resume/${token}`;
  const { items, totalAmount, currency } = await resolveRsvpAsoebiOrder(rsvp);

  const sent = await sendPaymentReminderEmail(req, rsvp, resumeUrl, items, totalAmount, currency);
  req.log.info({ rsvpId: id, sent }, "Payment reminder requested");
  res.json(SendPaymentReminderResponse.parse({ sent }));
});

export default router;
