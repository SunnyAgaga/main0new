import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { CreateRsvpBody, CreateRsvpResponse } from "@workspace/api-zod";
import { asoebiItemsTable, db, rsvpsTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/rsvps", async (req, res): Promise<void> => {
  const parsed = CreateRsvpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = parsed.data;
  let selectedItem: typeof asoebiItemsTable.$inferSelect | undefined;

  if (input.asoebiInterest === "yes") {
    if (!input.asoebiItemId || !input.asoebiSize) {
      res.status(400).json({
        error: "Please select an asoebi item and size before continuing.",
      });
      return;
    }

    [selectedItem] = await db
      .select()
      .from(asoebiItemsTable)
      .where(eq(asoebiItemsTable.id, input.asoebiItemId));

    if (
      !selectedItem ||
      !selectedItem.available ||
      !selectedItem.sizes.includes(input.asoebiSize)
    ) {
      res.status(400).json({ error: "The selected asoebi option is unavailable." });
      return;
    }
  }

  const [rsvp] = await db
    .insert(rsvpsTable)
    .values({
      guestName: input.guestName,
      email: input.email,
      phone: input.phone || null,
      attending: input.attending,
      guestCount: Math.max(1, Math.trunc(input.guestCount ?? 1)),
      asoebiInterest: input.asoebiInterest,
      asoebiItemId: selectedItem?.id ?? null,
      asoebiSize: input.asoebiSize ?? null,
      note: input.note || null,
    })
    .returning();

  req.log.info(
    { rsvpId: rsvp.id, asoebiInterest: rsvp.asoebiInterest },
    "RSVP created",
  );

  res.status(201).json(
    CreateRsvpResponse.parse({
      id: rsvp.id,
      guestName: rsvp.guestName,
      email: rsvp.email,
      attending: rsvp.attending,
      asoebiInterest: rsvp.asoebiInterest,
      nextStep: selectedItem ? "cart" : "complete",
      cartItem: selectedItem
        ? {
            id: selectedItem.id,
            name: selectedItem.name,
            price: Number(selectedItem.price),
            currency: selectedItem.currency,
            size: input.asoebiSize,
          }
        : null,
    }),
  );
});

export default router;