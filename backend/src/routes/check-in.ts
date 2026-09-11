import { Router, type IRouter } from "express";
import {
  GetRsvpPassResponse,
  ScanCheckInResponse,
  UpdateRsvpCheckInBody,
  UpdateRsvpConfirmationBody,
  UpdateAdminRsvpResponse,
} from "@wedplan/shared";
import {
  approveRsvp,
  checkInRsvp,
  eventDetailsCollection,
  findRsvpByPassToken,
  rejectRsvp,
  setRsvpCheckIn,
  type CheckInEvent,
  type Rsvp,
} from "@/db";
import { requirePermission } from "../middlewares/requireAuth";
import { sendGatePassEmail } from "@/lib/rsvp-emails";
import { toAdminRsvp } from "./admin";

const router: IRouter = Router();

async function eventDateAndVenue(event: CheckInEvent): Promise<{ date: string; venue: string }> {
  const details = await eventDetailsCollection().findOne({ id: 1 });
  return event === "traditional"
    ? { date: details?.traditionalDate ?? "", venue: details?.traditionalVenue ?? "" }
    : { date: details?.weddingDate ?? "", venue: details?.weddingVenue ?? "" };
}

function checkedInAtFor(rsvp: Rsvp, event: CheckInEvent): Date | null {
  return event === "traditional" ? rsvp.traditionalCheckedInAt : rsvp.weddingCheckedInAt;
}

router.get("/rsvp-pass/:token", async (req, res): Promise<void> => {
  const found = await findRsvpByPassToken(String(req.params.token));
  if (!found) {
    res.status(404).json({ error: "Pass not found." });
    return;
  }

  const { rsvp, event } = found;
  const { date, venue } = await eventDateAndVenue(event);
  res.json(
    GetRsvpPassResponse.parse({
      guestName: rsvp.guestName,
      guestCount: rsvp.guestCount,
      event,
      eventDate: date,
      eventVenue: venue,
      checkedInAt: checkedInAtFor(rsvp, event)?.toISOString() ?? null,
      alreadyCheckedIn: Boolean(checkedInAtFor(rsvp, event)),
    }),
  );
});

router.post("/admin/check-in/:token", requirePermission("check-in"), async (req, res): Promise<void> => {
  const found = await findRsvpByPassToken(String(req.params.token));
  if (!found) {
    res.status(404).json({ error: "Pass not recognized." });
    return;
  }

  const { event } = found;
  const { rsvp, alreadyCheckedIn } = await checkInRsvp(found.rsvp.id, event);
  const { date, venue } = await eventDateAndVenue(event);

  req.log.info({ rsvpId: rsvp.id, event, alreadyCheckedIn }, "Guest check-in scanned");
  res.json(
    ScanCheckInResponse.parse({
      guestName: rsvp.guestName,
      guestCount: rsvp.guestCount,
      event,
      eventDate: date,
      eventVenue: venue,
      checkedInAt: checkedInAtFor(rsvp, event)?.toISOString() ?? null,
      alreadyCheckedIn,
    }),
  );
});

router.put("/admin/rsvps/:id/check-in", requirePermission("check-in"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = UpdateRsvpCheckInBody.safeParse(req.body);
  if (!Number.isFinite(id) || !parsed.success) {
    res.status(400).json({ error: parsed.error?.message ?? "Invalid request." });
    return;
  }

  const updated = await setRsvpCheckIn(id, parsed.data.event as CheckInEvent, parsed.data.checkedIn);
  if (!updated) {
    res.status(404).json({ error: "RSVP not found." });
    return;
  }

  res.json(UpdateAdminRsvpResponse.parse(toAdminRsvp(updated)));
});

router.put("/admin/rsvps/:id/confirmation", requirePermission("rsvps"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = UpdateRsvpConfirmationBody.safeParse(req.body);
  if (!Number.isFinite(id) || !parsed.success) {
    res.status(400).json({ error: parsed.error?.message ?? "Invalid request." });
    return;
  }

  if (parsed.data.status === "rejected") {
    const updated = await rejectRsvp(id);
    if (!updated) {
      res.status(404).json({ error: "RSVP not found." });
      return;
    }
    req.log.info({ rsvpId: id }, "RSVP rejected");
    res.json(UpdateAdminRsvpResponse.parse(toAdminRsvp(updated)));
    return;
  }

  const updated = await approveRsvp(id);
  if (!updated) {
    res.status(400).json({ error: "This RSVP isn't marked attending, or wasn't found." });
    return;
  }

  await sendGatePassEmail(req, updated);
  req.log.info({ rsvpId: id }, "RSVP approved, gate passes issued");
  res.json(UpdateAdminRsvpResponse.parse(toAdminRsvp(updated)));
});

export default router;
