import { Router, type IRouter } from "express";
import { GetEventResponse } from "@wedplan/shared";

const router: IRouter = Router();

router.get("/event", (_req, res): void => {
  res.json(
    GetEventResponse.parse({
      id: "wedplan-demo-wedding",
      coupleNames: "Tola & Dami",
      traditionalDate: "2026-12-10T12:00:00+01:00",
      traditionalVenue: "The Adebayo Family Compound, Ibadan",
      weddingDate: "2026-12-12T12:00:00+01:00",
      weddingVenue: "The Monarch Event Centre, Lagos",
      rsvpDeadline: "2026-11-15",
      welcomeMessage:
        "With joyful hearts, we invite you to celebrate the beginning of our forever.",
    }),
  );
});

export default router;