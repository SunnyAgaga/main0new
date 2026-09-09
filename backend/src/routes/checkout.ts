import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  CreateBankTransferOrderBody,
  CreateBankTransferOrderResponse,
  CreateGiftBankTransferOrderBody,
  StartFlutterwaveCheckoutBody,
  StartFlutterwaveCheckoutResponse,
  StartGiftFlutterwaveCheckoutBody,
} from "@wedplan/shared";
import {
  asoebiItemsCollection,
  insertOrder,
  paymentConfigsCollection,
  rsvpsCollection,
  type AsoebiItem,
  type PaymentConfig,
  type Rsvp,
} from "@/db";

const router: IRouter = Router();

interface OrderLine {
  guestName: string;
  item: AsoebiItem;
  size: string;
  quantity: number;
}

interface ValidatedOrder {
  rsvp: Rsvp;
  lines: OrderLine[];
  totalAmount: number;
  currency: string;
}

function guestSelectionKey(guestName: string, itemId: number, size: string): string {
  return `${guestName}::${itemId}::${size}`;
}

async function validateOrderInput(input: {
  rsvpId: number;
  items: { guestName: string; itemId: number; size: string }[];
}): Promise<ValidatedOrder | null> {
  if (input.items.length === 0) return null;

  const rsvp = await rsvpsCollection().findOne({ id: input.rsvpId });
  if (!rsvp) return null;

  // Quantity is never trusted from the client — it's looked up from the
  // RSVP's own stored selections so a checkout request can't inflate it.
  const validSelections = new Map<string, number>();
  for (const selection of rsvp.asoebiSelections) {
    validSelections.set(
      guestSelectionKey(rsvp.guestName, selection.asoebiItemId, selection.asoebiSize),
      selection.quantity,
    );
  }
  for (const guest of rsvp.additionalGuests) {
    for (const selection of guest.asoebiSelections) {
      validSelections.set(
        guestSelectionKey(guest.name, selection.asoebiItemId, selection.asoebiSize),
        selection.quantity,
      );
    }
  }

  const lines: OrderLine[] = [];

  for (const requested of input.items) {
    const key = guestSelectionKey(requested.guestName, requested.itemId, requested.size);
    const quantity = validSelections.get(key);
    if (!quantity) return null;

    const item = await asoebiItemsCollection().findOne({ id: requested.itemId });
    if (!item || !item.available || !item.sizes.includes(requested.size)) return null;

    lines.push({ guestName: requested.guestName, item, size: requested.size, quantity });
  }

  const currency = lines[0].item.currency;
  const totalAmount = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);

  return { rsvp, lines, totalAmount, currency };
}

async function createFlutterwaveLink(params: {
  secretKey: string;
  reference: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  email: string;
  name: string;
  title: string;
  description: string;
}): Promise<{ link: string } | { error: string }> {
  const response = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: params.reference,
      amount: params.amount,
      currency: params.currency,
      redirect_url: params.redirectUrl,
      customer: { email: params.email, name: params.name },
      customizations: { title: params.title, description: params.description },
    }),
  });

  const payload = (await response.json()) as {
    message?: string;
    data?: { link?: string };
  };

  if (!response.ok || !payload.data?.link) {
    return {
      error: payload.message || "Flutterwave checkout is unavailable right now.",
    };
  }

  return { link: payload.data.link };
}

function flutterwaveConfigured(config: PaymentConfig | null): config is PaymentConfig {
  return Boolean(config?.flutterwaveEnabled && config.flutterwaveSecretKey.startsWith("FLWSECK"));
}

function bankTransferConfigured(config: PaymentConfig | null): config is PaymentConfig {
  return Boolean(
    config?.bankTransferEnabled &&
      config.bankName &&
      config.accountName &&
      config.accountNumber,
  );
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

  const config = await paymentConfigsCollection().findOne({ id: 1 });
  if (!flutterwaveConfigured(config)) {
    res.status(503).json({ error: "Flutterwave has not been configured yet." });
    return;
  }

  const reference = `WED-${randomUUID()}`;
  const origin = `${req.protocol}://${req.get("host")}`;
  // Empty for a root domain. Set WEDPLAN_BASE_PATH only when the app is served
  // from a sub-path, and keep it in sync with the frontend's BASE_PATH.
  const appBasePath = (process.env.WEDPLAN_BASE_PATH ?? "").replace(/\/$/, "");
  const description = validated.lines
    .map((line) => `${line.item.name} (${line.guestName})`)
    .join(", ");

  const result = await createFlutterwaveLink({
    secretKey: config.flutterwaveSecretKey,
    reference,
    amount: validated.totalAmount,
    currency: validated.currency,
    redirectUrl: `${origin}${appBasePath}/cart?payment=complete`,
    email: parsed.data.email,
    name: parsed.data.guestName,
    title: "WedPlan Asoebi",
    description,
  });

  if ("error" in result) {
    req.log.warn({ flutterwaveMessage: result.error }, "Flutterwave checkout creation failed");
    res.status(503).json({ error: result.error });
    return;
  }

  await insertOrder({
    reference,
    type: "asoebi",
    rsvpId: validated.rsvp.id,
    guestName: validated.rsvp.guestName,
    email: parsed.data.email,
    items: validated.lines.map((line) => ({
      guestName: line.guestName,
      asoebiItemId: line.item.id,
      size: line.size,
      quantity: line.quantity,
      amount: line.item.price * line.quantity,
    })),
    giftMessage: null,
    totalAmount: validated.totalAmount,
    currency: validated.currency,
    paymentMethod: "flutterwave",
    status: "pending",
  });

  res.json(
    StartFlutterwaveCheckoutResponse.parse({
      reference,
      checkoutUrl: result.link,
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

  const config = await paymentConfigsCollection().findOne({ id: 1 });
  if (!bankTransferConfigured(config)) {
    res.status(503).json({ error: "Bank transfer has not been configured yet." });
    return;
  }

  const reference = `WED-BT-${randomUUID().slice(0, 8).toUpperCase()}`;
  await insertOrder({
    reference,
    type: "asoebi",
    rsvpId: validated.rsvp.id,
    guestName: validated.rsvp.guestName,
    email: parsed.data.email,
    items: validated.lines.map((line) => ({
      guestName: line.guestName,
      asoebiItemId: line.item.id,
      size: line.size,
      quantity: line.quantity,
      amount: line.item.price * line.quantity,
    })),
    giftMessage: null,
    totalAmount: validated.totalAmount,
    currency: validated.currency,
    paymentMethod: "bank_transfer",
    status: "awaiting_transfer",
  });

  res.status(201).json(
    CreateBankTransferOrderResponse.parse({
      reference,
      amount: validated.totalAmount,
      currency: validated.currency,
      bankName: config.bankName,
      accountName: config.accountName,
      accountNumber: config.accountNumber,
      instructions:
        config.bankInstructions ||
        "Use your order reference as the transfer narration.",
    }),
  );
});

router.post("/checkout/gift/flutterwave", async (req, res): Promise<void> => {
  const parsed = StartGiftFlutterwaveCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const config = await paymentConfigsCollection().findOne({ id: 1 });
  if (!flutterwaveConfigured(config)) {
    res.status(503).json({ error: "Flutterwave has not been configured yet." });
    return;
  }

  const reference = `WED-GIFT-${randomUUID()}`;
  const origin = `${req.protocol}://${req.get("host")}`;
  // Empty for a root domain. Set WEDPLAN_BASE_PATH only when the app is served
  // from a sub-path, and keep it in sync with the frontend's BASE_PATH.
  const appBasePath = (process.env.WEDPLAN_BASE_PATH ?? "").replace(/\/$/, "");

  const result = await createFlutterwaveLink({
    secretKey: config.flutterwaveSecretKey,
    reference,
    amount: parsed.data.amount,
    currency: "NGN",
    redirectUrl: `${origin}${appBasePath}/gift?payment=complete`,
    email: parsed.data.email,
    name: parsed.data.guestName,
    title: "WedPlan Gift",
    description: parsed.data.message || `Wedding gift from ${parsed.data.guestName}`,
  });

  if ("error" in result) {
    req.log.warn({ flutterwaveMessage: result.error }, "Flutterwave gift checkout creation failed");
    res.status(503).json({ error: result.error });
    return;
  }

  await insertOrder({
    reference,
    type: "gift",
    rsvpId: null,
    guestName: parsed.data.guestName,
    email: parsed.data.email,
    items: [],
    giftMessage: parsed.data.message || null,
    totalAmount: parsed.data.amount,
    currency: "NGN",
    paymentMethod: "flutterwave",
    status: "pending",
  });

  res.json(
    StartFlutterwaveCheckoutResponse.parse({
      reference,
      checkoutUrl: result.link,
    }),
  );
});

router.post("/checkout/gift/bank-transfer", async (req, res): Promise<void> => {
  const parsed = CreateGiftBankTransferOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const config = await paymentConfigsCollection().findOne({ id: 1 });
  if (!bankTransferConfigured(config)) {
    res.status(503).json({ error: "Bank transfer has not been configured yet." });
    return;
  }

  const reference = `WED-GIFT-BT-${randomUUID().slice(0, 8).toUpperCase()}`;
  await insertOrder({
    reference,
    type: "gift",
    rsvpId: null,
    guestName: parsed.data.guestName,
    email: parsed.data.email,
    items: [],
    giftMessage: parsed.data.message || null,
    totalAmount: parsed.data.amount,
    currency: "NGN",
    paymentMethod: "bank_transfer",
    status: "awaiting_transfer",
  });

  res.status(201).json(
    CreateBankTransferOrderResponse.parse({
      reference,
      amount: parsed.data.amount,
      currency: "NGN",
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
