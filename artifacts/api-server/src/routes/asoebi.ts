import { Router, type IRouter } from "express";
import { asc } from "drizzle-orm";
import { ListAsoebiResponse } from "@workspace/api-zod";
import { asoebiItemsTable, db } from "@workspace/db";

const router: IRouter = Router();

router.get("/asoebi", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(asoebiItemsTable)
    .orderBy(asc(asoebiItemsTable.id));

  res.json(
    ListAsoebiResponse.parse(
      items.map((item) => ({ ...item, price: Number(item.price) })),
    ),
  );
});

export default router;