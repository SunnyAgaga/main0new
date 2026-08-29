import { Router, type IRouter } from "express";
import { GetEventResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/event", (_req, res): void => {
  res.json(
    GetEventResponse.parse({
      id: "wedplan-demo-wedding",
      coupleNames: "Tola & Dami",
      date: "2026-12-12T12:00:00+01:00",
      venue: "The Monarch Event Centre, Lagos",
      rsvpDeadline: "2026-11-15",
      welcomeMessage:
        "With joyful hearts, we invite you to celebrate the beginning of our forever.",
    }),
  );
});

export default router;