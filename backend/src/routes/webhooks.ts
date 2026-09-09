import { Router, type IRouter } from "express";
import { ordersCollection, paymentConfigsCollection } from "@/db";

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

export default router;
