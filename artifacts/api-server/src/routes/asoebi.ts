import { Router, type IRouter } from "express";
import { ListAsoebiResponse } from "@workspace/api-zod";
import { asoebiItemsCollection } from "@workspace/db";

const router: IRouter = Router();

router.get("/asoebi", async (_req, res): Promise<void> => {
  const items = await asoebiItemsCollection()
    .find({}, { projection: { _id: 0 } })
    .sort({ id: 1 })
    .toArray();

  res.json(ListAsoebiResponse.parse(items));
});

export default router;
