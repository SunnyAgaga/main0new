import { Router, type IRouter, type Request } from "express";
import { CreateRsvpBody, CreateRsvpResponse } from "@wedplan/shared";
import { asoebiItemsCollection, insertRsvp, notificationConfigsCollection, type AsoebiItem, type Rsvp } from "@/db";
import { sendMailgunEmail } from "@/lib/mailgun";

const router: IRouter = Router();

// Mirrors the dev/prod origin split used for Spotify's OAuth redirect: in dev,
// Vite serves the SPA on its own port and proxies /api here, so a link meant
// for the guest's browser has to point at that port, not this API's own.
function guestOrigin(req: Request): string {
  if (process.env.NODE_ENV !== "production" && process.env.FRONTEND_PORT) {
    return `${req.protocol}://${req.hostname}:${process.env.FRONTEND_PORT}`;
  }
  return `${req.protocol}://${req.get("host")}`;
}

async function sendGatePassEmail(req: Request, rsvp: Rsvp): Promise<void> {
  if (!rsvp.attending || !rsvp.traditionalPassToken || !rsvp.weddingPassToken) return;

  const config = await notificationConfigsCollection().findOne({ id: 1 });
  if (!config?.emailEnabled || !config.mailgunApiKey || !config.mailgunDomain || !config.mailgunFromEmail) {
    return;
  }

  const basePath = (process.env.WEDPLAN_BASE_PATH ?? "").replace(/\/$/, "");
  const origin = guestOrigin(req);
  const traditionalUrl = `${origin}${basePath}/pass/${rsvp.traditionalPassToken}`;
  const weddingUrl = `${origin}${basePath}/pass/${rsvp.weddingPassToken}`;

  const text = [
    `Hi ${rsvp.guestName},`,
    ``,
    `Thank you for confirming you'll be joining us! Here are your gate passes for the day —`,
    `show the QR code on either page at the entrance.`,
    ``,
    `Traditional Wedding pass: ${traditionalUrl}`,
    `White Wedding pass: ${weddingUrl}`,
    ``,
    `See you there!`,
  ].join("\n");

  try {
    await sendMailgunEmail({
      apiKey: config.mailgunApiKey,
      domain: config.mailgunDomain,
      from: config.mailgunFromEmail,
      to: rsvp.email,
      subject: "Your wedding gate passes",
      text,
    });
  } catch (err) {
    req.log.warn({ err, rsvpId: rsvp.id }, "Failed to send gate pass email");
  }
}

interface ResolvedSelection {
  item: AsoebiItem;
  size: string;
  quantity: number;
}

async function resolveSelections(
  selections: { itemId: number; size: string; quantity: number }[] | undefined,
): Promise<ResolvedSelection[] | "invalid"> {
  if (!selections || selections.length === 0) return [];

  const resolved: ResolvedSelection[] = [];
  for (const selection of selections) {
    if (selection.quantity < 1) return "invalid";

    const item = await asoebiItemsCollection().findOne({ id: selection.itemId });
    if (!item || !item.available || !item.sizes.includes(selection.size)) {
      return "invalid";
    }

    resolved.push({ item, size: selection.size, quantity: selection.quantity });
  }

  return resolved;
}

router.post("/rsvps", async (req, res): Promise<void> => {
  const parsed = CreateRsvpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = parsed.data;
  const wantsAsoebi = input.asoebiInterest === "yes";

  let primarySelections: ResolvedSelection[] = [];
  if (wantsAsoebi) {
    const resolved = await resolveSelections(input.asoebiSelections);
    if (resolved === "invalid") {
      res.status(400).json({ error: "The selected asoebi option is unavailable." });
      return;
    }
    if (resolved.length === 0) {
      res.status(400).json({
        error: "Please select at least one asoebi item before continuing.",
      });
      return;
    }
    primarySelections = resolved;
  }

  const additionalGuestsInput = input.additionalGuests ?? [];
  const additionalGuests: { name: string; selections: ResolvedSelection[] }[] = [];

  for (const guest of additionalGuestsInput) {
    if (!wantsAsoebi) {
      additionalGuests.push({ name: guest.name, selections: [] });
      continue;
    }

    const resolved = await resolveSelections(guest.asoebiSelections);
    if (resolved === "invalid") {
      res.status(400).json({
        error: `The selected asoebi option for ${guest.name} is unavailable.`,
      });
      return;
    }

    additionalGuests.push({ name: guest.name, selections: resolved });
  }

  let deliveryMethod: "pickup" | "delivery" | null = null;
  let deliveryAddress: string | null = null;
  let deliveryProvider: string | null = null;

  if (wantsAsoebi) {
    if (!input.deliveryMethod) {
      res.status(400).json({ error: "Please select a pickup or delivery option." });
      return;
    }
    if (input.deliveryMethod === "delivery" && !input.deliveryAddress?.trim()) {
      res.status(400).json({ error: "Please provide a delivery address." });
      return;
    }
    deliveryMethod = input.deliveryMethod;
    deliveryAddress = input.deliveryMethod === "delivery" ? input.deliveryAddress!.trim() : null;
    deliveryProvider =
      input.deliveryMethod === "delivery" ? input.deliveryProvider?.trim() || null : null;
  }

  const rsvp = await insertRsvp({
    guestName: input.guestName,
    email: input.email,
    phone: input.phone || null,
    attending: input.attending,
    guestCount: Math.max(1, Math.trunc(input.guestCount ?? 1)),
    additionalGuests: additionalGuests.map((guest) => ({
      name: guest.name,
      asoebiSelections: guest.selections.map((selection) => ({
        asoebiItemId: selection.item.id,
        asoebiSize: selection.size,
        quantity: selection.quantity,
      })),
    })),
    asoebiInterest: input.asoebiInterest,
    asoebiSelections: primarySelections.map((selection) => ({
      asoebiItemId: selection.item.id,
      asoebiSize: selection.size,
      quantity: selection.quantity,
    })),
    deliveryMethod,
    deliveryAddress,
    deliveryProvider,
    note: input.note || null,
  });

  req.log.info(
    { rsvpId: rsvp.id, asoebiInterest: rsvp.asoebiInterest },
    "RSVP created",
  );

  await sendGatePassEmail(req, rsvp);

  const cartItems = [
    ...primarySelections.map((selection) => ({
      guestName: rsvp.guestName,
      asoebiItemId: selection.item.id,
      name: selection.item.name,
      price: selection.item.price,
      currency: selection.item.currency,
      size: selection.size,
      quantity: selection.quantity,
    })),
    ...additionalGuests.flatMap((guest) =>
      guest.selections.map((selection) => ({
        guestName: guest.name,
        asoebiItemId: selection.item.id,
        name: selection.item.name,
        price: selection.item.price,
        currency: selection.item.currency,
        size: selection.size,
        quantity: selection.quantity,
      })),
    ),
  ];

  res.status(201).json(
    CreateRsvpResponse.parse({
      id: rsvp.id,
      guestName: rsvp.guestName,
      email: rsvp.email,
      attending: rsvp.attending,
      asoebiInterest: rsvp.asoebiInterest,
      nextStep: cartItems.length > 0 ? "cart" : "complete",
      cartItems,
      deliveryMethod: rsvp.deliveryMethod,
      deliveryAddress: rsvp.deliveryAddress,
      deliveryProvider: rsvp.deliveryProvider,
    }),
  );
});

export default router;
