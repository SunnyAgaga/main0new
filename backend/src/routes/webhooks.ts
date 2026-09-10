import { Router, type IRouter } from "express";
import {
  deliveryConfigsCollection,
  markOrderDeliveredByReference,
  ordersCollection,
  paymentConfigsCollection,
} from "@/db";

const router: IRouter = Router();

interface FlutterwaveWebhookPayload {
  event?: string;
  data?: {
    tx_ref?: string;
    status?: string;
  };
}

router.post("/webhooks/flutterwave", async (req, res): Promise<void> => {
  const config = await paymentConfigsCollection().findOne({ id: 1 });
  const signature = req.headers["verif-hash"];

  if (!config?.flutterwaveWebhookSecret || signature !== config.flutterwaveWebhookSecret) {
    req.log.warn("Rejected Flutterwave webhook with invalid or missing signature");
    res.status(401).end();
    return;
  }

  const payload = req.body as FlutterwaveWebhookPayload;
  const reference = payload.data?.tx_ref;
  const status = payload.data?.status;

  if (!reference || !status) {
    res.status(200).end();
    return;
  }

  const nextStatus =
    status === "successful" ? "paid" : status === "failed" ? "failed" : null;

  if (nextStatus) {
    await ordersCollection().updateOne(
      { reference },
      { $set: { status: nextStatus } },
    );
    req.log.info({ reference, status: nextStatus }, "Order status updated from webhook");
  }

  res.status(200).end();
});

// Generic receiver for a future delivery/logistics provider. No specific
// provider is wired up yet, so the payload shape below is a best guess at
// common field names (reference/tx_ref + a delivered-ish status/event) -
// once a real provider is chosen, replace this with its actual webhook
// schema. Until then this at least lets a courier that happens to match
// mark the matching order delivered automatically instead of doing nothing.
router.post("/webhooks/delivery", async (req, res): Promise<void> => {
  const config = await deliveryConfigsCollection().findOne({ id: 1 });
  const signature = req.headers["x-webhook-secret"];

  if (!config?.webhookSecret || signature !== config.webhookSecret) {
    req.log.warn("Rejected delivery webhook with invalid or missing signature");
    res.status(401).end();
    return;
  }

  req.log.info({ body: req.body }, "Received delivery webhook");

  const body = req.body as Record<string, unknown>;
  const reference = [body.reference, body.tx_ref, body.order_reference].find(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  const status = [body.status, body.event].find(
    (v): v is string => typeof v === "string",
  );
  const delivered = status ? /deliver|complete|success/i.test(status) : false;

  if (reference && delivered) {
    const updated = await markOrderDeliveredByReference(reference);
    if (updated) {
      req.log.info({ reference }, "Order marked delivered from delivery webhook");
    }
  }

  res.status(200).end();
});

export default router;
