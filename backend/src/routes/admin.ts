import { Router, type IRouter } from "express";
import {
  CreateAdminUserBody,
  CreateAdminUserResponse,
  DeleteAdminUserParams,
  GetAdminOverviewResponse,
  GetPaymentConfigResponse,
  ListAdminUsersResponse,
  ListAdminRsvpsResponse,
  ListAdminOrdersResponse,
  UpdateAdminRsvpBody,
  UpdateAdminRsvpParams,
  UpdateAdminRsvpResponse,
  UpdateAdminUserBody,
  UpdateAdminUserParams,
  UpdateAdminUserResponse,
  UpdateOrderFulfillmentBody,
  UpdateOrderFulfillmentParams,
  UpdateOrderFulfillmentResponse,
  UpdatePaymentConfigBody,
  UpdatePaymentConfigResponse,
} from "@wedplan/shared";
import { isPermissionKey } from "@wedplan/shared";
import {
  deleteUser,
  insertUser,
  listUsers,
  ordersCollection,
  paymentConfigsCollection,
  rsvpsCollection,
  updateOrderFulfillment,
  updateRsvp,
  updateUserAccess,
  upsertPaymentConfig,
  usersCollection,
  type Order,
  type PaymentConfig,
  type Rsvp,
} from "@/db";
import { requireAdmin, requireAuth, requirePermission } from "../middlewares/requireAuth";
import { toAuthUser } from "./auth";

function sanitizePermissions(permissions: string[]): string[] {
  return permissions.filter(isPermissionKey);
}

function toAdminRsvp(rsvp: Rsvp) {
  return {
    id: rsvp.id,
    guestName: rsvp.guestName,
    email: rsvp.email,
    phone: rsvp.phone ?? null,
    attending: rsvp.attending,
    guestCount: rsvp.guestCount,
    additionalGuests: rsvp.additionalGuests ?? [],
    asoebiInterest: rsvp.asoebiInterest,
    asoebiSelections: rsvp.asoebiSelections ?? [],
    deliveryMethod: rsvp.deliveryMethod ?? null,
    deliveryAddress: rsvp.deliveryAddress ?? null,
    deliveryProvider: rsvp.deliveryProvider ?? null,
    note: rsvp.note ?? null,
    createdAt: rsvp.createdAt.toISOString(),
  };
}

const router: IRouter = Router();

function safePaymentConfig(config: PaymentConfig | null | undefined, webhookUrl: string) {
  const secret = config?.flutterwaveSecretKey ?? "";
  return {
    flutterwaveConfigured: Boolean(config?.flutterwaveEnabled && secret),
    flutterwaveKeyHint: secret ? `••••${secret.slice(-4)}` : "Not configured",
    webhookUrl,
    webhookSecretConfigured: Boolean(config?.flutterwaveWebhookSecret),
    bankTransferConfigured: Boolean(
      config?.bankTransferEnabled &&
        config.bankName &&
        config.accountName &&
        config.accountNumber,
    ),
    bankTransfer: {
      bankName: config?.bankName ?? "",
      accountName: config?.accountName ?? "",
      accountNumber: config?.accountNumber ?? "",
      instructions: config?.bankInstructions ?? "",
    },
  };
}

function webhookUrlFor(req: { protocol: string; get(name: string): string | undefined }): string {
  return `${req.protocol}://${req.get("host")}/api/webhooks/flutterwave`;
}

router.get("/admin/overview", requireAuth, async (_req, res): Promise<void> => {
  const [totalRsvps, attendingCount, asoebiInterestCount, paidOrders, recentRsvps] =
    await Promise.all([
      rsvpsCollection().countDocuments(),
      rsvpsCollection().countDocuments({ attending: true }),
      rsvpsCollection().countDocuments({ asoebiInterest: "yes" }),
      ordersCollection().countDocuments({ status: "paid" }),
      rsvpsCollection()
        .find({}, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray(),
    ]);

  res.json(
    GetAdminOverviewResponse.parse({
      totalRsvps,
      attendingCount,
      asoebiInterestCount,
      paidOrders,
      recentRsvps: recentRsvps.map((rsvp) => ({
        guestName: rsvp.guestName,
        attending: rsvp.attending,
        asoebiInterest: rsvp.asoebiInterest,
        createdAt: rsvp.createdAt.toISOString(),
      })),
    }),
  );
});

router.get(
  "/admin/payment-config",
  requirePermission("payments"),
  async (req, res): Promise<void> => {
    const config = await paymentConfigsCollection().findOne({ id: 1 });
    res.json(GetPaymentConfigResponse.parse(safePaymentConfig(config, webhookUrlFor(req))));
  },
);

router.put(
  "/admin/payment-config",
  requirePermission("payments"),
  async (req, res): Promise<void> => {
    const parsed = UpdatePaymentConfigBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const existing = await paymentConfigsCollection().findOne({ id: 1 });
    const secret =
      parsed.data.flutterwaveSecretKey.trim() ||
      existing?.flutterwaveSecretKey ||
      "";
    const webhookSecret =
      parsed.data.flutterwaveWebhookSecret?.trim() ||
      existing?.flutterwaveWebhookSecret ||
      "";

    if (
      parsed.data.flutterwaveEnabled &&
      secret &&
      !secret.startsWith("FLWSECK")
    ) {
      res.status(400).json({
        error: "Enter a valid Flutterwave secret key beginning with FLWSECK.",
      });
      return;
    }

    const config = await upsertPaymentConfig({
      flutterwaveEnabled: parsed.data.flutterwaveEnabled,
      flutterwaveSecretKey: secret,
      flutterwaveWebhookSecret: webhookSecret,
      bankTransferEnabled: parsed.data.bankTransferEnabled,
      bankName: parsed.data.bankTransfer.bankName.trim(),
      accountName: parsed.data.bankTransfer.accountName.trim(),
      accountNumber: parsed.data.bankTransfer.accountNumber.trim(),
      bankInstructions: parsed.data.bankTransfer.instructions.trim(),
    });

    req.log.info("Payment configuration updated");
    res.json(UpdatePaymentConfigResponse.parse(safePaymentConfig(config, webhookUrlFor(req))));
  },
);

router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await listUsers();
  res.json(ListAdminUsersResponse.parse(users.map(toAuthUser)));
});

router.post("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await usersCollection().findOne({ email });
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const user = await insertUser({
    email,
    password: parsed.data.password,
    role: parsed.data.role,
    permissions: sanitizePermissions(parsed.data.permissions),
  });

  req.log.info({ userId: user.id, role: user.role }, "Admin user created");
  res.status(201).json(CreateAdminUserResponse.parse(toAuthUser(user)));
});

router.put("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const paramsResult = UpdateAdminUserParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: paramsResult.error.message });
    return;
  }

  if (paramsResult.data.id === req.user!.id) {
    res.status(400).json({ error: "You cannot edit your own account." });
    return;
  }

  const parsed = UpdateAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await usersCollection().findOne({ id: paramsResult.data.id });
  if (!existing) {
    res.status(404).json({ error: "Admin user not found." });
    return;
  }

  const updated = await updateUserAccess(paramsResult.data.id, {
    role: parsed.data.role,
    permissions: sanitizePermissions(parsed.data.permissions),
  });

  req.log.info(
    { userId: paramsResult.data.id, role: parsed.data.role },
    "Admin user access updated",
  );
  res.json(UpdateAdminUserResponse.parse(toAuthUser(updated!)));
});

router.delete("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const parsed = DeleteAdminUserParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.id === req.user!.id) {
    res.status(400).json({ error: "You cannot remove your own account." });
    return;
  }

  const existing = await usersCollection().findOne({ id: parsed.data.id });
  if (!existing) {
    res.status(404).json({ error: "Admin user not found." });
    return;
  }

  await deleteUser(parsed.data.id);
  req.log.info({ userId: parsed.data.id }, "Admin user removed");
  res.status(204).end();
});

function toAdminOrder(order: Order) {
  return {
    id: order.id,
    reference: order.reference,
    type: order.type,
    guestName: order.guestName,
    email: order.email,
    totalAmount: order.totalAmount,
    giftAmount: order.giftAmount ?? 0,
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    status: order.status,
    itemCount: order.items.length,
    createdAt: order.createdAt.toISOString(),
    deliveryMethod: order.deliveryMethod ?? null,
    fulfillmentStatus: order.fulfillmentStatus ?? "pending",
    fulfilledAt: order.fulfilledAt ? order.fulfilledAt.toISOString() : null,
  };
}

router.get("/admin/orders", requirePermission("orders"), async (_req, res): Promise<void> => {
  const orders = await ordersCollection().find({}).sort({ createdAt: -1 }).toArray();
  res.json(ListAdminOrdersResponse.parse(orders.map(toAdminOrder)));
});

router.put(
  "/admin/orders/:id/fulfillment",
  requirePermission("orders"),
  async (req, res): Promise<void> => {
    const paramsResult = UpdateOrderFulfillmentParams.safeParse(req.params);
    if (!paramsResult.success) {
      res.status(400).json({ error: paramsResult.error.message });
      return;
    }

    const parsed = UpdateOrderFulfillmentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const updated = await updateOrderFulfillment(paramsResult.data.id, parsed.data.status);
    if (!updated) {
      res.status(404).json({ error: "Order not found." });
      return;
    }

    req.log.info(
      { orderId: paramsResult.data.id, status: parsed.data.status },
      "Order fulfillment status updated",
    );
    res.json(UpdateOrderFulfillmentResponse.parse(toAdminOrder(updated)));
  },
);

router.get("/admin/rsvps", requirePermission("rsvps"), async (_req, res): Promise<void> => {
  const rsvps = await rsvpsCollection().find({}).sort({ createdAt: -1 }).toArray();
  res.json(ListAdminRsvpsResponse.parse(rsvps.map(toAdminRsvp)));
});

router.put("/admin/rsvps/:id", requirePermission("rsvps"), async (req, res): Promise<void> => {
  const paramsResult = UpdateAdminRsvpParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: paramsResult.error.message });
    return;
  }

  const parsed = UpdateAdminRsvpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await rsvpsCollection().findOne({ id: paramsResult.data.id });
  if (!existing) {
    res.status(404).json({ error: "RSVP not found." });
    return;
  }

  const input = parsed.data;
  const updated = await updateRsvp(paramsResult.data.id, {
    guestName: input.guestName,
    email: input.email,
    phone: input.phone || null,
    attending: input.attending,
    guestCount: Math.max(1, Math.trunc(input.guestCount ?? 1)),
    additionalGuests: (input.additionalGuests ?? []).map((guest) => ({
      name: guest.name,
      asoebiSelections: (guest.asoebiSelections ?? []).map((selection) => ({
        asoebiItemId: selection.itemId,
        asoebiSize: selection.size,
        quantity: selection.quantity,
      })),
    })),
    asoebiInterest: input.asoebiInterest,
    asoebiSelections: (input.asoebiSelections ?? []).map((selection) => ({
      asoebiItemId: selection.itemId,
      asoebiSize: selection.size,
      quantity: selection.quantity,
    })),
    deliveryMethod: input.deliveryMethod ?? null,
    deliveryAddress: input.deliveryAddress ?? null,
    deliveryProvider: input.deliveryProvider ?? null,
    note: input.note || null,
  });

  req.log.info({ rsvpId: paramsResult.data.id }, "RSVP updated by admin");
  res.json(UpdateAdminRsvpResponse.parse(toAdminRsvp(updated!)));
});

export default router;
