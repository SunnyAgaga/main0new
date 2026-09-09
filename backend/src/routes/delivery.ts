import { Router, type IRouter } from "express";
import {
  GetDeliveryConfigResponse,
  UpdateDeliveryConfigBody,
  UpdateDeliveryConfigResponse,
  GetDeliveryOptionsResponse,
} from "@wedplan/shared";
import { deliveryConfigsCollection, upsertDeliveryConfig, type DeliveryConfig } from "@/db";
import { requireAdmin } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/delivery-options", async (_req, res): Promise<void> => {
  const config = await deliveryConfigsCollection().findOne({ id: 1 });
  res.json(
    GetDeliveryOptionsResponse.parse({
      deliveryEnabled: Boolean(config?.deliveryEnabled),
      pickupLocation: config?.pickupLocation ?? "",
      deliveryFee: config?.deliveryFee ?? 0,
      providers: (config?.providers ?? [])
        .filter((provider) => provider.enabled)
        .map((provider) => ({ name: provider.name, fee: provider.fee })),
    }),
  );
});

function safeDeliveryConfig(config: DeliveryConfig | null | undefined, webhookUrl: string) {
  return {
    deliveryEnabled: Boolean(config?.deliveryEnabled),
    providerConfigured: Boolean(config?.providerName && config.apiKey),
    providerName: config?.providerName ?? "",
    webhookUrl,
    webhookSecretConfigured: Boolean(config?.webhookSecret),
    pickupLocation: config?.pickupLocation ?? "",
    deliveryFee: config?.deliveryFee ?? 0,
    providers: config?.providers ?? [],
  };
}

function webhookUrlFor(req: { protocol: string; get(name: string): string | undefined }): string {
  return `${req.protocol}://${req.get("host")}/api/webhooks/delivery`;
}

router.get("/admin/delivery-config", requireAdmin, async (req, res): Promise<void> => {
  const config = await deliveryConfigsCollection().findOne({ id: 1 });
  res.json(GetDeliveryConfigResponse.parse(safeDeliveryConfig(config, webhookUrlFor(req))));
});

router.put("/admin/delivery-config", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateDeliveryConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await deliveryConfigsCollection().findOne({ id: 1 });
  const apiKey = parsed.data.apiKey.trim() || existing?.apiKey || "";
  const webhookSecret = parsed.data.webhookSecret.trim() || existing?.webhookSecret || "";

  const config = await upsertDeliveryConfig({
    deliveryEnabled: parsed.data.deliveryEnabled,
    providerName: parsed.data.providerName.trim(),
    apiKey,
    webhookSecret,
    pickupLocation: parsed.data.pickupLocation.trim(),
    deliveryFee: parsed.data.deliveryFee,
    providers: parsed.data.providers,
  });

  req.log.info("Delivery configuration updated");
  res.json(UpdateDeliveryConfigResponse.parse(safeDeliveryConfig(config, webhookUrlFor(req))));
});

export default router;
