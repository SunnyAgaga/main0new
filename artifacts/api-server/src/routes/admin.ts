import { Router, type IRouter } from "express";
import { and, count, desc, eq } from "drizzle-orm";
import {
  GetAdminOverviewResponse,
  GetPaymentConfigResponse,
  UpdatePaymentConfigBody,
  UpdatePaymentConfigResponse,
} from "@workspace/api-zod";
import {
  db,
  ordersTable,
  paymentConfigsTable,
  rsvpsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function safePaymentConfig(config?: typeof paymentConfigsTable.$inferSelect) {
  const secret = config?.flutterwaveSecretKey ?? "";
  return {
    flutterwaveConfigured: Boolean(config?.flutterwaveEnabled && secret),
    flutterwaveKeyHint: secret ? `••••${secret.slice(-4)}` : "Not configured",
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

router.get("/admin/overview", requireAuth, async (_req, res): Promise<void> => {
  const [
    [{ totalRsvps }],
    [{ attendingCount }],
    [{ asoebiInterestCount }],
    [{ paidOrders }],
    recentRsvps,
  ] = await Promise.all([
    db.select({ totalRsvps: count() }).from(rsvpsTable),
    db
      .select({ attendingCount: count() })
      .from(rsvpsTable)
      .where(eq(rsvpsTable.attending, true)),
    db
      .select({ asoebiInterestCount: count() })
      .from(rsvpsTable)
      .where(eq(rsvpsTable.asoebiInterest, "yes")),
    db
      .select({ paidOrders: count() })
      .from(ordersTable)
      .where(and(eq(ordersTable.status, "paid"))),
    db
      .select()
      .from(rsvpsTable)
      .orderBy(desc(rsvpsTable.createdAt))
      .limit(6),
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
  requireAuth,
  async (_req, res): Promise<void> => {
    const [config] = await db
      .select()
      .from(paymentConfigsTable)
      .where(eq(paymentConfigsTable.id, 1));

    res.json(GetPaymentConfigResponse.parse(safePaymentConfig(config)));
  },
);

router.put(
  "/admin/payment-config",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = UpdatePaymentConfigBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(paymentConfigsTable)
      .where(eq(paymentConfigsTable.id, 1));
    const secret =
      parsed.data.flutterwaveSecretKey.trim() ||
      existing?.flutterwaveSecretKey ||
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

    const [config] = await db
      .insert(paymentConfigsTable)
      .values({
        id: 1,
        flutterwaveEnabled: parsed.data.flutterwaveEnabled,
        flutterwaveSecretKey: secret,
        bankTransferEnabled: parsed.data.bankTransferEnabled,
        bankName: parsed.data.bankTransfer.bankName.trim(),
        accountName: parsed.data.bankTransfer.accountName.trim(),
        accountNumber: parsed.data.bankTransfer.accountNumber.trim(),
        bankInstructions: parsed.data.bankTransfer.instructions.trim(),
      })
      .onConflictDoUpdate({
        target: paymentConfigsTable.id,
        set: {
          flutterwaveEnabled: parsed.data.flutterwaveEnabled,
          flutterwaveSecretKey: secret,
          bankTransferEnabled: parsed.data.bankTransferEnabled,
          bankName: parsed.data.bankTransfer.bankName.trim(),
          accountName: parsed.data.bankTransfer.accountName.trim(),
          accountNumber: parsed.data.bankTransfer.accountNumber.trim(),
          bankInstructions: parsed.data.bankTransfer.instructions.trim(),
          updatedAt: new Date(),
        },
      })
      .returning();

    req.log.info("Payment configuration updated");
    res.json(
      UpdatePaymentConfigResponse.parse(safePaymentConfig(config)),
    );
  },
);

export default router;