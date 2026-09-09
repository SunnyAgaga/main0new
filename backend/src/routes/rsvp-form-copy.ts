import { Router, type IRouter } from "express";
import {
  GetRsvpFormCopyResponse,
  UpdateRsvpFormCopyBody,
  UpdateRsvpFormCopyResponse,
} from "@wedplan/shared";
import {
  rsvpFormCopyCollection,
  upsertRsvpFormCopy,
  DEFAULT_RSVP_FORM_COPY,
  type RsvpFormCopy,
} from "@/db";
import { requireAdmin } from "../middlewares/requireAuth";

const router: IRouter = Router();

function toRsvpFormCopy(copy: RsvpFormCopy | null | undefined) {
  return { ...DEFAULT_RSVP_FORM_COPY, ...copy };
}

router.get("/rsvp-form-copy", async (_req, res): Promise<void> => {
  const copy = await rsvpFormCopyCollection().findOne({ id: 1 });
  res.json(GetRsvpFormCopyResponse.parse(toRsvpFormCopy(copy)));
});

router.put("/admin/rsvp-form-copy", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateRsvpFormCopyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const copy = await upsertRsvpFormCopy(parsed.data);
  req.log.info("RSVP form copy updated");
  res.json(UpdateRsvpFormCopyResponse.parse(toRsvpFormCopy(copy)));
});

export default router;
