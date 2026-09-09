import { Router, type IRouter } from "express";
import {
  CreateAsoebiItemBody,
  CreateAsoebiItemResponse,
  DeleteAsoebiItemParams,
  UpdateAsoebiItemBody,
  UpdateAsoebiItemParams,
  UpdateAsoebiItemResponse,
} from "@wedplan/shared";
import { deleteAsoebiItem, insertAsoebiItem, updateAsoebiItem } from "@/db";
import { requireAdmin } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.post("/admin/asoebi", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateAsoebiItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const item = await insertAsoebiItem({
    category: parsed.data.category,
    name: parsed.data.name.trim(),
    description: parsed.data.description.trim(),
    price: parsed.data.price,
    currency: "NGN",
    imageUrl: parsed.data.imageUrl.trim(),
    sizes: ["Standard"],
    available: parsed.data.available,
  });

  req.log.info({ itemId: item.id }, "Asoebi item created");
  res.status(201).json(CreateAsoebiItemResponse.parse(item));
});

router.put("/admin/asoebi/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateAsoebiItemParams.safeParse(req.params);
  const parsed = UpdateAsoebiItemBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: (params.error ?? parsed.error)!.message });
    return;
  }

  const item = await updateAsoebiItem(params.data.id, {
    category: parsed.data.category,
    name: parsed.data.name.trim(),
    description: parsed.data.description.trim(),
    price: parsed.data.price,
    currency: "NGN",
    imageUrl: parsed.data.imageUrl.trim(),
    available: parsed.data.available,
  });

  if (!item) {
    res.status(404).json({ error: "Asoebi item not found." });
    return;
  }

  req.log.info({ itemId: item.id }, "Asoebi item updated");
  res.json(UpdateAsoebiItemResponse.parse(item));
});

router.delete("/admin/asoebi/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteAsoebiItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const deleted = await deleteAsoebiItem(params.data.id);
  if (!deleted) {
    res.status(404).json({ error: "Asoebi item not found." });
    return;
  }

  req.log.info({ itemId: params.data.id }, "Asoebi item removed");
  res.status(204).end();
});

export default router;
