import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  CreateBankTransferOrderBody,
  CreateBankTransferOrderResponse,
  StartFlutterwaveCheckoutBody,
  StartFlutterwaveCheckoutResponse,
} from "@workspace/api-zod";
import {
  asoebiItemsTable,
  db,
  ordersTable,
  paymentConfigsTable,
  rsvpsTable,
} from "@workspace/db";

const router: IRouter = Router();

async function validateOrderInput(input: {
  rsvpId: number;
  itemId: number;
  size: string;
}) {
  const [[rsvp], [item]] = await Promise.all([
    db.select().from(rsvpsTable).where(eq(rsvpsTable.id, input.rsvpId)),
    db
      .select()
      .from(asoebiItemsTable)
      .where(eq(asoebiItemsTable.id, input.itemId)),
  ]);

  if (
    !rsvp ||
    !item ||
    !item.available ||
    rsvp.asoebiItemId !== item.id ||
    rsvp.asoebiSize !== input.size
  ) {
    return null;
  }

  return { rsvp, item, amount: Number(item.price) };
}

router.post("/checkout/flutterwave", async (req, res): Promise<void> => {
  const parsed = StartFlutterwaveCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const validated = await validateOrderInput(parsed.data);
  if (!validated) {
    res.status(400).json({ error: "The selected order could not be verified." });
    return;
  }

  const [config] = await db
    .select()
    .from(paymentConfigsTable)
    .where(eq(paymentConfigsTable.id, 1));

  if (
    !config?.flutterwaveEnabled ||
    !config.flutterwaveSecretKey.startsWith("FLWSECK")
  ) {
    res.status(503).json({ error: "Flutterwave has not been configured yet." });
    return;
  }

  const reference = `WED-${randomUUID()}`;
  const origin = `${req.protocol}://${req.get("host")}`;
  const appBasePath = process.env.WEDPLAN_BASE_PATH ?? "/wedplan";
  const response = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.flutterwaveSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: reference,
      amount: validated.amount,
      currency: validated.item.currency,
      redirect_url: `${origin}${appBasePath}/cart?payment=complete`,
      customer: {
        email: parsed.data.email,
        name: parsed.data.guestName,
      },
      customizations: {
        title: "WedPlan Asoebi",
        description: `${validated.item.name} — ${parsed.data.size}`,
      },
    }),
  });

  const payload = (await response.json()) as {
    status?: string;
    message?: string;
    data?: { link?: string };
  };

  if (!response.ok || !payload.data?.link) {
    req.log.warn(
      { status: response.status, flutterwaveMessage: payload.message },
      "Flutterwave checkout creation failed",
    );
    res.status(503).json({
      error: payload.message || "Flutterwave checkout is unavailable right now.",
    });
    return;
  }

  await db.insert(ordersTable).values({
    reference,
    rsvpId: validated.rsvp.id,
    asoebiItemId: validated.item.id,
    size: parsed.data.size,
    amount: validated.item.price,
    currency: validated.item.currency,
    paymentMethod: "flutterwave",
    status: "pending",
  });

  res.json(
    StartFlutterwaveCheckoutResponse.parse({
      reference,
      checkoutUrl: payload.data.link,
    }),
  );
});

router.post("/checkout/bank-transfer", async (req, res): Promise<void> => {
  const parsed = CreateBankTransferOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const validated = await validateOrderInput(parsed.data);
  if (!validated) {
    res.status(400).json({ error: "The selected order could not be verified." });
    return;
  }

  const [config] = await db
    .select()
    .from(paymentConfigsTable)
    .where(eq(paymentConfigsTable.id, 1));

  if (
    !config?.bankTransferEnabled ||
    !config.bankName ||
    !config.accountName ||
    !config.accountNumber
  ) {
    res.status(503).json({ error: "Bank transfer has not been configured yet." });
    return;
  }

  const reference = `WED-BT-${randomUUID().slice(0, 8).toUpperCase()}`;
  await db.insert(ordersTable).values({
    reference,
    rsvpId: validated.rsvp.id,
    asoebiItemId: validated.item.id,
    size: parsed.data.size,
    amount: validated.item.price,
    currency: validated.item.currency,
    paymentMethod: "bank_transfer",
    status: "awaiting_transfer",
  });

  res.status(201).json(
    CreateBankTransferOrderResponse.parse({
      reference,
      amount: validated.amount,
      currency: validated.item.currency,
      bankName: config.bankName,
      accountName: config.accountName,
      accountNumber: config.accountNumber,
      instructions:
        config.bankInstructions ||
        "Use your order reference as the transfer narration.",
    }),
  );
});

export default router;