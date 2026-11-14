import { Router, type IRouter } from "express";
import { GetEventResponse, UpdateEventBody, UpdateEventResponse } from "@wedplan/shared";
import {
  eventDetailsCollection,
  upsertEventDetails,
  DEFAULT_EVENT_DETAILS,
  type EventDetails,
} from "@/db";
import { requirePermission } from "../middlewares/requireAuth";

const router: IRouter = Router();

function toEvent(details: EventDetails | null | undefined) {
  // Older saved documents predate rsvpClosesAt/asoebiClosesAt - fall back to
  // the defaults for those two fields specifically rather than requiring a
  // fresh admin save before GET /event works again.
  const source = { ...DEFAULT_EVENT_DETAILS, ...details };
  return {
    id: "wedplan-demo-wedding",
    coupleNames: source.coupleNames,
    traditionalDate: source.traditionalDate,
    traditionalVenue: source.traditionalVenue,
    weddingDate: source.weddingDate,
    weddingVenue: source.weddingVenue,
    rsvpDeadline: source.rsvpDeadline,
    rsvpClosesAt: source.rsvpClosesAt,
    asoebiClosesAt: source.asoebiClosesAt,
    welcomeMessage: source.welcomeMessage,
    showVenueOnWebsite: source.showVenueOnWebsite,
    showVenueInEmail: source.showVenueInEmail,
  };
}

router.get("/event", async (_req, res): Promise<void> => {
  const details = await eventDetailsCollection().findOne({ id: 1 });
  res.json(GetEventResponse.parse(toEvent(details)));
});

router.put("/admin/event", requirePermission("site-settings"), async (req, res): Promise<void> => {
  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const details = await upsertEventDetails(parsed.data);
  req.log.info("Event details updated");
  res.json(UpdateEventResponse.parse(toEvent(details)));
});

export default router;
