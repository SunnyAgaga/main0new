import { Router, type IRouter } from "express";
import { and, asc, count, desc, eq } from "drizzle-orm";
import {
  asoEbiItemsTable,
  asoEbiOrdersTable,
  db,
  guestsTable,
  notificationCampaignsTable,
  weddingsTable,
} from "@workspace/db";
import {
  CreateAsoEbiOrderBody,
  CreateAsoEbiOrderResponse,
  CreateGuestBody,
  CreateGuestResponse,
  CheckInGuestBody,
  CheckInGuestResponse,
  CreateNotificationBody,
  CreateNotificationResponse,
  GetDashboardResponse,
  GetWeddingResponse,
  InitializePaystackPaymentBody,
  InitializePaystackPaymentResponse,
  ListAsoEbiOrdersResponse,
  ListAsoEbiResponse,
  ListGuestsResponse,
  ListNotificationsResponse,
  UpdateWeddingBody,
  UpdateWeddingResponse,
  UpdateGuestRsvpBody,
  UpdateGuestRsvpParams,
  UpdateGuestRsvpResponse,
  VerifyPaystackPaymentParams,
  VerifyPaystackPaymentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const PAYSTACK_API_BASE_URL = "https://api.paystack.co";

const toGuest = (guest: typeof guestsTable.$inferSelect) => ({
  ...guest,
  registeredAt: guest.registeredAt.toISOString(),
  checkedInAt: guest.checkedInAt?.toISOString() ?? null,
});

const getLagosCalendarDate = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (kind: string) => parts.find((part) => part.type === kind)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
};

const toCampaign = (campaign: typeof notificationCampaignsTable.$inferSelect) => ({
  ...campaign,
  sentAt: campaign.sentAt.toISOString(),
});

const toItem = (item: typeof asoEbiItemsTable.$inferSelect) => ({
  ...item,
  price: Number(item.price),
});

const toOrder = (order: typeof asoEbiOrdersTable.$inferSelect) => ({
  ...order,
  amount: Number(order.amount),
  orderedAt: order.orderedAt.toISOString(),
});

const toWedding = (wedding: typeof weddingsTable.$inferSelect) => {
  const target = new Date(`${wedding.date}T00:00:00+01:00`).getTime();
  const daysRemaining = Math.max(
    0,
    Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return {
    ...wedding,
    daysRemaining,
  };
};

let seedPromise: Promise<void> | null = null;

async function ensureSeedData(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedData();
  }
  await seedPromise;
}

async function seedData(): Promise<void> {
  const [wedding] = await db
    .select()
    .from(weddingsTable)
    .orderBy(asc(weddingsTable.id))
    .limit(1);
  if (!wedding) {
    await db.insert(weddingsTable).values({
      couple: "Tomiwa & Dami",
      date: "2026-11-14",
      venue: "The Balmoral, Federal Palace",
      city: "Lagos, Nigeria",
    });
  }

  const [guestCount] = await db.select({ value: count() }).from(guestsTable);
  if (Number(guestCount?.value ?? 0) === 0) {
    await db.insert(guestsTable).values([
      {
        name: "Amara Okafor",
        email: "amara@example.com",
        phone: "+234 803 555 0190",
        partySize: 2,
        rsvp: "attending",
        tags: ["Family", "Aso Ebi"],
      },
      {
        name: "Seyi Williams",
        email: "seyi@example.com",
        phone: "+234 802 555 0142",
        partySize: 1,
        rsvp: "pending",
        tags: ["Friends"],
      },
      {
        name: "Olu & Nneka Adeyemi",
        email: "olu.nneka@example.com",
        phone: "+234 806 555 0178",
        partySize: 2,
        rsvp: "attending",
        tags: ["Family", "Table 4"],
      },
    ]);
  }

  const [campaignCount] = await db
    .select({ value: count() })
    .from(notificationCampaignsTable);
  if (Number(campaignCount?.value ?? 0) === 0) {
    await db.insert(notificationCampaignsTable).values([
      {
        title: "Save the date is here",
        channel: "email",
        audience: "All guests",
        status: "sent",
        opens: 82,
      },
      {
        title: "Aso Ebi booking reminder",
        channel: "whatsapp",
        audience: "Guests yet to order",
        status: "scheduled",
        opens: 0,
      },
    ]);
  }

  const asoEbiSamples = [
    {
      name: "Aso Ebi Fabric — Ladies, 3 yards",
      color: "Lavender and plum celebration fabric",
      price: "24000.00",
      available: 120,
      image: "ladies-fabric-3-yards",
    },
    {
      name: "Aso Ebi Fabric — Ladies, 4 yards",
      color: "Lavender and plum celebration fabric",
      price: "32000.00",
      available: 120,
      image: "ladies-fabric-4-yards",
    },
    {
      name: "Aso Ebi Fabric — Ladies, 5 yards",
      color: "Lavender and plum celebration fabric",
      price: "40000.00",
      available: 120,
      image: "ladies-fabric-5-yards",
    },
    {
      name: "Sego Gele Head Wrap",
      color: "Coordinating champagne head wrap",
      price: "12500.00",
      available: 80,
      image: "sego-gele",
    },
    {
      name: "Men's Cap / Fila",
      color: "Coordinating plum fila",
      price: "13000.00",
      available: 80,
      image: "mens-fila",
    },
  ];

  const legacyItemUpdates = [
    ["Champagne Lace", asoEbiSamples[0]],
    ["Plum George", asoEbiSamples[1]],
    ["Olive Senator", asoEbiSamples[2]],
  ] as const;
  for (const [legacyName, sample] of legacyItemUpdates) {
    await db
      .update(asoEbiItemsTable)
      .set(sample)
      .where(eq(asoEbiItemsTable.name, legacyName));
  }

  const items = await db.select({ name: asoEbiItemsTable.name }).from(asoEbiItemsTable);
  const existingItemNames = new Set(items.map((item) => item.name));
  const missingSamples = asoEbiSamples.filter((sample) => !existingItemNames.has(sample.name));
  if (missingSamples.length > 0) {
    await db.insert(asoEbiItemsTable).values(missingSamples);
  }

  const [orderCount] = await db
    .select({ value: count() })
    .from(asoEbiOrdersTable);
  if (Number(orderCount?.value ?? 0) === 0) {
    await db.insert(asoEbiOrdersTable).values([
      {
        guestName: "Amara Okafor",
        phone: "+234 803 555 0190",
        email: "amara@example.com",
        itemName: "Aso Ebi Fabric — Ladies, 3 yards",
        quantity: 2,
        amount: "48000.00",
        status: "paid",
        orderMode: "ready_to_pay",
        deliveryAddress: "Lagos, Nigeria",
      },
      {
        guestName: "Olu & Nneka Adeyemi",
        phone: "+234 806 555 0178",
        email: "olu.nneka@example.com",
        itemName: "Aso Ebi Fabric — Ladies, 4 yards",
        quantity: 2,
        amount: "64000.00",
        status: "pending",
        orderMode: "reservation",
        deliveryAddress: "Lagos, Nigeria",
      },
    ]);
  }

  const legacyOrderUpdates = [
    ["Champagne Lace", "Aso Ebi Fabric — Ladies, 3 yards", "24000.00"],
    ["Plum George", "Aso Ebi Fabric — Ladies, 4 yards", "32000.00"],
    ["Olive Senator", "Aso Ebi Fabric — Ladies, 5 yards", "40000.00"],
  ] as const;
  for (const [legacyName, itemName, unitPrice] of legacyOrderUpdates) {
    const legacyOrders = await db
      .select()
      .from(asoEbiOrdersTable)
      .where(eq(asoEbiOrdersTable.itemName, legacyName));
    for (const order of legacyOrders) {
      await db
        .update(asoEbiOrdersTable)
        .set({ itemName, amount: String(order.quantity * Number(unitPrice)) })
        .where(eq(asoEbiOrdersTable.id, order.id));
    }
  }

  const demoContactUpdates = [
    {
      guestName: "Amara Okafor",
      phone: "+234 803 555 0190",
      email: "amara@example.com",
      deliveryAddress: "Lekki Phase 1, Lagos",
      orderMode: "ready_to_pay",
    },
    {
      guestName: "Olu & Nneka Adeyemi",
      phone: "+234 806 555 0178",
      email: "olu.nneka@example.com",
      deliveryAddress: "Ikeja GRA, Lagos",
      orderMode: "reservation",
    },
  ] as const;
  for (const details of demoContactUpdates) {
    await db
      .update(asoEbiOrdersTable)
      .set(details)
      .where(
        and(
          eq(asoEbiOrdersTable.guestName, details.guestName),
          eq(asoEbiOrdersTable.phone, ""),
        ),
      );
  }
}

router.get("/wedding", async (req, res): Promise<void> => {
  await ensureSeedData();
  const [wedding] = await db
    .select()
    .from(weddingsTable)
    .orderBy(asc(weddingsTable.id))
    .limit(1);
  if (!wedding) {
    req.log.error("Wedding seed was not available");
    res.status(500).json({ error: "Wedding data unavailable" });
    return;
  }

  res.json(GetWeddingResponse.parse(toWedding(wedding)));
});

router.patch("/wedding", async (req, res): Promise<void> => {
  await ensureSeedData();
  const parsed = UpdateWeddingBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.flatten() }, "Invalid wedding settings");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [current] = await db
    .select()
    .from(weddingsTable)
    .orderBy(asc(weddingsTable.id))
    .limit(1);
  if (!current) {
    res.status(404).json({ error: "Wedding not found" });
    return;
  }

  const [wedding] = await db
    .update(weddingsTable)
    .set({
      ...parsed.data,
      date: parsed.data.date,
    })
    .where(eq(weddingsTable.id, current.id))
    .returning();

  res.json(UpdateWeddingResponse.parse(toWedding(wedding)));
});

router.get("/dashboard", async (_req, res): Promise<void> => {
  await ensureSeedData();
  const guests = await db.select().from(guestsTable);
  const orders = await db.select().from(asoEbiOrdersTable);
  const attending = guests.filter((guest) => guest.rsvp === "attending").length;
  const pending = guests.filter((guest) => guest.rsvp === "pending").length;
  const declined = guests.filter((guest) => guest.rsvp === "declined").length;
  const answered = attending + declined;

  res.json(
    GetDashboardResponse.parse({
      registered: guests.length,
      attending,
      pending,
      declined,
      rsvpRate: guests.length ? Math.round((answered / guests.length) * 100) : 0,
      totalCollected: orders
        .filter((order) => order.status === "paid" || order.status === "collected")
        .reduce((sum, order) => sum + Number(order.amount), 0),
      recentActivity: [
        ...guests.slice(-3).map((guest) => ({
          id: guest.id,
          text: `${guest.name} registered for the celebration`,
          time: guest.registeredAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          }),
          kind: "guest",
        })),
        ...orders.slice(-2).map((order) => ({
          id: 1000 + order.id,
          text: `${order.guestName} placed an Aso Ebi order`,
          time: order.orderedAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          }),
          kind: "order",
        })),
      ],
    }),
  );
});

router.get("/guests", async (_req, res): Promise<void> => {
  await ensureSeedData();
  const guests = await db
    .select()
    .from(guestsTable)
    .orderBy(desc(guestsTable.registeredAt));
  res.json(ListGuestsResponse.parse(guests.map(toGuest)));
});

router.post("/guests", async (req, res): Promise<void> => {
  const parsed = CreateGuestBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.flatten() }, "Invalid guest registration");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = parsed.data.email
    ? await db
        .select()
        .from(guestsTable)
        .where(eq(guestsTable.email, parsed.data.email))
    : [];
  if (existing) {
    res.status(400).json({ error: "A guest with this email is already registered." });
    return;
  }

  const [guest] = await db
    .insert(guestsTable)
    .values({ ...parsed.data, rsvp: parsed.data.rsvp ?? "pending", tags: ["New registration"] })
    .returning();
  res.status(201).json(CreateGuestResponse.parse(toGuest(guest)));
});

router.patch("/guests/:id/rsvp", async (req, res): Promise<void> => {
  const params = UpdateGuestRsvpParams.safeParse(req.params);
  const parsed = UpdateGuestRsvpBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid RSVP update" });
    return;
  }

  const [guest] = await db
    .update(guestsTable)
    .set({ rsvp: parsed.data.rsvp })
    .where(eq(guestsTable.id, params.data.id))
    .returning();
  if (!guest) {
    res.status(404).json({ error: "Guest not found" });
    return;
  }

  res.json(UpdateGuestRsvpResponse.parse(toGuest(guest)));
});

router.post("/guests/check-in", async (req, res): Promise<void> => {
  await ensureSeedData();
  const parsed = CheckInGuestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter the email address used to register." });
    return;
  }

  const [wedding] = await db
    .select()
    .from(weddingsTable)
    .orderBy(asc(weddingsTable.id))
    .limit(1);
  if (!wedding) {
    res.status(404).json({ error: "Wedding not found" });
    return;
  }

  if (getLagosCalendarDate() !== wedding.whiteWeddingDate) {
    res.status(403).json({
      error: "Check-in opens on the white wedding date.",
      availableOn: wedding.whiteWeddingDate,
    });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const [guest] = await db
    .select()
    .from(guestsTable)
    .where(eq(guestsTable.email, email))
    .limit(1);
  if (!guest) {
    res.status(404).json({ error: "We could not find a registration for that email address." });
    return;
  }

  if (guest.checkedInAt) {
    res.json(CheckInGuestResponse.parse(toGuest(guest)));
    return;
  }

  const [checkedInGuest] = await db
    .update(guestsTable)
    .set({ checkedInAt: new Date() })
    .where(eq(guestsTable.id, guest.id))
    .returning();
  res.json(CheckInGuestResponse.parse(toGuest(checkedInGuest)));
});

router.get("/notifications", async (_req, res): Promise<void> => {
  await ensureSeedData();
  const campaigns = await db
    .select()
    .from(notificationCampaignsTable)
    .orderBy(desc(notificationCampaignsTable.sentAt));
  res.json(ListNotificationsResponse.parse(campaigns.map(toCampaign)));
});

router.post("/notifications", async (req, res): Promise<void> => {
  const parsed = CreateNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [campaign] = await db
    .insert(notificationCampaignsTable)
    .values({ ...parsed.data, status: "scheduled", opens: 0 })
    .returning();
  res.status(201).json(CreateNotificationResponse.parse(toCampaign(campaign)));
});

router.get("/aso-ebi", async (_req, res): Promise<void> => {
  await ensureSeedData();
  const items = await db.select().from(asoEbiItemsTable);
  res.json(ListAsoEbiResponse.parse(items.map(toItem)));
});

router.get("/aso-ebi/orders", async (_req, res): Promise<void> => {
  await ensureSeedData();
  const orders = await db
    .select()
    .from(asoEbiOrdersTable)
    .orderBy(desc(asoEbiOrdersTable.orderedAt));
  res.json(ListAsoEbiOrdersResponse.parse(orders.map(toOrder)));
});

router.post("/aso-ebi/orders", async (req, res): Promise<void> => {
  const parsed = CreateAsoEbiOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db
    .insert(asoEbiOrdersTable)
    .values({
      ...parsed.data,
      amount: String(parsed.data.amount),
      status: "pending",
      paymentStatus: parsed.data.orderMode === "reservation" ? "unpaid" : "pending",
    })
    .returning();
  res.status(201).json(CreateAsoEbiOrderResponse.parse(toOrder(order)));
});

router.post("/payments/paystack/initialize", async (req, res): Promise<void> => {
  const parsed = InitializePaystackPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid order and email address are required for Paystack checkout." });
    return;
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    req.log.error("PAYSTACK_SECRET_KEY is not configured");
    res.status(503).json({ error: "Online payments are not available right now." });
    return;
  }

  const [order] = await db
    .select()
    .from(asoEbiOrdersTable)
    .where(eq(asoEbiOrdersTable.id, parsed.data.orderId))
    .limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  if (!order.paymentMethod.startsWith("paystack_")) {
    res.status(400).json({ error: "This order is configured for manual bank transfer." });
    return;
  }

  const reference = `wedplan-${order.id}-${Date.now()}`;
  const channel = order.paymentMethod === "paystack_card" ? "card" : "bank_transfer";
  const protocol = req.get("x-forwarded-proto") ?? req.protocol;
  const callbackUrl = `${protocol}://${req.get("host")}/payment-complete?reference=${encodeURIComponent(reference)}`;
  const response = await fetch(`${PAYSTACK_API_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: parsed.data.email,
      amount: Math.round(Number(order.amount) * 100),
      currency: "NGN",
      reference,
      callback_url: callbackUrl,
      channels: [channel],
      metadata: { orderId: order.id, itemName: order.itemName },
    }),
  });
  const result = await response.json() as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; access_code?: string; reference?: string };
  };
  if (!response.ok || !result.status || !result.data?.authorization_url || !result.data.access_code) {
    req.log.error({ status: response.status, message: result.message }, "Paystack initialization failed");
    res.status(502).json({ error: result.message ?? "Could not start Paystack checkout." });
    return;
  }

  await db
    .update(asoEbiOrdersTable)
    .set({ paymentReference: result.data.reference ?? reference, paymentStatus: "pending" })
    .where(eq(asoEbiOrdersTable.id, order.id));
  res.json(InitializePaystackPaymentResponse.parse({
    reference: result.data.reference ?? reference,
    authorizationUrl: result.data.authorization_url,
    accessCode: result.data.access_code,
  }));
});

router.get("/payments/paystack/verify/:reference", async (req, res): Promise<void> => {
  const parsed = VerifyPaystackPaymentParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payment reference." });
    return;
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    res.status(503).json({ error: "Online payments are not available right now." });
    return;
  }

  const response = await fetch(
    `${PAYSTACK_API_BASE_URL}/transaction/verify/${encodeURIComponent(parsed.data.reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  const result = await response.json() as {
    status?: boolean;
    message?: string;
    data?: { status?: string; reference?: string };
  };
  if (!response.ok || !result.status || !result.data) {
    if (response.status === 404 || result.message?.toLowerCase().includes("reference not found")) {
      res.json(VerifyPaystackPaymentResponse.parse({
        reference: parsed.data.reference,
        status: "not_found",
        paid: false,
        orderId: null,
      }));
      return;
    }
    req.log.error({ status: response.status, message: result.message }, "Paystack verification failed");
    res.status(502).json({ error: result.message ?? "Could not verify this Paystack payment." });
    return;
  }

  const reference = result.data.reference ?? parsed.data.reference;
  const [order] = await db
    .select()
    .from(asoEbiOrdersTable)
    .where(eq(asoEbiOrdersTable.paymentReference, reference))
    .limit(1);
  const paid = result.data.status === "success";
  if (order) {
    await db
      .update(asoEbiOrdersTable)
      .set({ paymentStatus: paid ? "paid" : "failed", status: paid ? "paid" : "pending" })
      .where(eq(asoEbiOrdersTable.id, order.id));
  }

  res.json(VerifyPaystackPaymentResponse.parse({
    reference,
    status: result.data.status ?? "unknown",
    paid,
    orderId: order?.id ?? null,
  }));
});

export default router;