import { Router, type IRouter } from "express";
import { GetEventResponse, UpdateEventBody, UpdateEventResponse } from "@wedplan/shared";
import {
  eventDetailsCollection,
  upsertEventDetails,
  DEFAULT_EVENT_DETAILS,
  type EventDetails,
} from "@/db";
import { requireAdmin } from "../middlewares/requireAuth";

const router: IRouter = Router();

function toEvent(details: EventDetails | null | undefined) {
  const source = details ?? { id: "wedplan-demo-wedding" as const, ...DEFAULT_EVENT_DETAILS };
  return {
    id: "wedplan-demo-wedding",
    coupleNames: source.coupleNames,
    traditionalDate: source.traditionalDate,
    traditionalVenue: source.traditionalVenue,
    weddingDate: source.weddingDate,
    weddingVenue: source.weddingVenue,
    rsvpDeadline: source.rsvpDeadline,
    welcomeMessage: source.welcomeMessage,
  };
}

router.get("/event", async (_req, res): Promise<void> => {
  const details = await eventDetailsCollection().findOne({ id: 1 });
  res.json(GetEventResponse.parse(toEvent(details)));
});

router.put("/admin/event", requireAdmin, async (req, res): Promise<void> => {
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
