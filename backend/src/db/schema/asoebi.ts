import { z } from "zod/v4";
import { db } from "../client";
import { nextSequence } from "../counters";

export interface AsoebiItem {
  id: number;
  category: "women" | "men";
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  sizes: string[];
  available: boolean;
  createdAt: Date;
}

export interface AsoebiSelection {
  asoebiItemId: number;
  asoebiSize: string;
  quantity: number;
}

export interface AdditionalGuest {
  name: string;
  asoebiSelections: AsoebiSelection[];
}

export interface Rsvp {
  id: number;
  guestName: string;
  email: string;
  phone: string | null;
  attending: boolean;
  guestCount: number;
  additionalGuests: AdditionalGuest[];
  asoebiInterest: string;
  asoebiSelections: AsoebiSelection[];
  deliveryMethod: "pickup" | "delivery" | null;
  deliveryAddress: string | null;
  deliveryProvider: string | null;
  note: string | null;
  createdAt: Date;
}

export interface PaymentConfig {
  id: 1;
  flutterwaveEnabled: boolean;
  flutterwaveSecretKey: string;
  flutterwaveWebhookSecret: string;
  bankTransferEnabled: boolean;
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankInstructions: string;
  updatedAt: Date;
}

export interface OrderLineItem {
  guestName: string;
  asoebiItemId: number;
  size: string;
  quantity: number;
  amount: number;
}

export interface Order {
  id: number;
  reference: string;
  type: "asoebi" | "gift";
  rsvpId: number | null;
  guestName: string;
  email: string;
  items: OrderLineItem[];
  giftAmount: number;
  giftMessage: string | null;
  deliveryMethod: "pickup" | "delivery" | null;
  deliveryAddress: string | null;
  deliveryProvider: string | null;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  fulfillmentStatus: "pending" | "delivered";
  fulfilledAt: Date | null;
  createdAt: Date;
}

export interface DeliveryProvider {
  id: string;
  name: string;
  fee: number;
  enabled: boolean;
}

export interface DeliveryConfig {
  id: 1;
  deliveryEnabled: boolean;
  providerName: string;
  apiKey: string;
  webhookSecret: string;
  pickupLocation: string;
  deliveryFee: number;
  providers: DeliveryProvider[];
  updatedAt: Date;
}

export interface NotificationConfig {
  id: 1;
  emailEnabled: boolean;
  mailgunApiKey: string;
  mailgunDomain: string;
  mailgunFromEmail: string;
  smsEnabled: boolean;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromNumber: string;
  updatedAt: Date;
}

export interface MusicTrack {
  title: string;
  url: string;
}

export interface SiteSettings {
  id: 1;
  musicEnabled: boolean;
  playlist: MusicTrack[];
  logoUrl: string;
  logoHeight: number;
  heroImageUrl: string;
  backgroundColor: string;
  primaryColor: string;
  accentColor: string;
  updatedAt: Date;
}

export const DEFAULT_SITE_SETTINGS: Omit<SiteSettings, "id" | "updatedAt"> = {
  musicEnabled: false,
  playlist: [],
  logoUrl: "",
  logoHeight: 32,
  heroImageUrl: "",
  backgroundColor: "#fdf9f3",
  primaryColor: "#1c4d3a",
  accentColor: "#e3c878",
};

export interface EventDetails {
  id: 1;
  coupleNames: string;
  traditionalDate: string;
  traditionalVenue: string;
  weddingDate: string;
  weddingVenue: string;
  rsvpDeadline: string;
  welcomeMessage: string;
  updatedAt: Date;
}

export const DEFAULT_EVENT_DETAILS: Omit<EventDetails, "id" | "updatedAt"> = {
  coupleNames: "Tola & Dami",
  traditionalDate: "2026-12-10T12:00:00+01:00",
  traditionalVenue: "The Adebayo Family Compound, Ibadan",
  weddingDate: "2026-12-12T12:00:00+01:00",
  weddingVenue: "The Monarch Event Centre, Lagos",
  rsvpDeadline: "2026-11-15",
  welcomeMessage:
    "With joyful hearts, we invite you to celebrate the beginning of our forever.",
};

export const eventDetailsCollection = () =>
  db.collection<EventDetails>("event_details");

export async function upsertEventDetails(
  input: Omit<EventDetails, "id" | "updatedAt">,
): Promise<EventDetails> {
  const result = await eventDetailsCollection().findOneAndUpdate(
    { id: 1 },
    { $set: { ...input, updatedAt: new Date() }, $setOnInsert: { id: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return result!;
}

export const asoebiItemsCollection = () =>
  db.collection<AsoebiItem>("asoebi_items");
export const rsvpsCollection = () => db.collection<Rsvp>("rsvps");
export const paymentConfigsCollection = () =>
  db.collection<PaymentConfig>("payment_configs");
export const ordersCollection = () => db.collection<Order>("orders");
export const deliveryConfigsCollection = () =>
  db.collection<DeliveryConfig>("delivery_configs");
export const notificationConfigsCollection = () =>
  db.collection<NotificationConfig>("notification_configs");
export const siteSettingsCollection = () =>
  db.collection<SiteSettings>("site_settings");

export const insertAsoebiItemSchema = z.object({
  category: z.enum(["women", "men"]),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  currency: z.string().default("NGN"),
  imageUrl: z.string(),
  sizes: z.array(z.string()),
  available: z.boolean().default(true),
});
export type InsertAsoebiItem = z.infer<typeof insertAsoebiItemSchema>;

const asoebiSelectionSchema = z.object({
  asoebiItemId: z.number(),
  asoebiSize: z.string(),
  quantity: z.number().min(1),
});

export const insertRsvpSchema = z.object({
  guestName: z.string(),
  email: z.string(),
  phone: z.string().nullable().optional(),
  attending: z.boolean(),
  guestCount: z.number().default(1),
  additionalGuests: z
    .array(
      z.object({
        name: z.string(),
        asoebiSelections: z.array(asoebiSelectionSchema).default([]),
      }),
    )
    .default([]),
  asoebiInterest: z.string(),
  asoebiSelections: z.array(asoebiSelectionSchema).default([]),
  deliveryMethod: z.enum(["pickup", "delivery"]).nullable().default(null),
  deliveryAddress: z.string().nullable().default(null),
  deliveryProvider: z.string().nullable().default(null),
  note: z.string().nullable().optional(),
});
export type InsertRsvp = z.infer<typeof insertRsvpSchema>;

export const insertOrderSchema = z.object({
  reference: z.string(),
  type: z.enum(["asoebi", "gift"]),
  rsvpId: z.number().nullable().default(null),
  guestName: z.string(),
  email: z.string(),
  items: z
    .array(
      z.object({
        guestName: z.string(),
        asoebiItemId: z.number(),
        size: z.string(),
        quantity: z.number(),
        amount: z.number(),
      }),
    )
    .default([]),
  giftAmount: z.number().default(0),
  giftMessage: z.string().nullable().default(null),
  deliveryMethod: z.enum(["pickup", "delivery"]).nullable().default(null),
  deliveryAddress: z.string().nullable().default(null),
  deliveryProvider: z.string().nullable().default(null),
  totalAmount: z.number(),
  currency: z.string().default("NGN"),
  paymentMethod: z.string(),
  status: z.string().default("pending"),
  fulfillmentStatus: z.enum(["pending", "delivered"]).default("pending"),
  fulfilledAt: z.date().nullable().default(null),
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export async function insertAsoebiItem(
  input: InsertAsoebiItem,
): Promise<AsoebiItem> {
  const doc: AsoebiItem = {
    ...input,
    id: await nextSequence("asoebi_items"),
    createdAt: new Date(),
  };
  await asoebiItemsCollection().insertOne(doc);
  return doc;
}

export async function updateAsoebiItem(
  id: number,
  input: Omit<InsertAsoebiItem, "sizes">,
): Promise<AsoebiItem | null> {
  return asoebiItemsCollection().findOneAndUpdate(
    { id },
    { $set: input },
    { returnDocument: "after" },
  );
}

export async function deleteAsoebiItem(id: number): Promise<boolean> {
  const result = await asoebiItemsCollection().deleteOne({ id });
  return result.deletedCount > 0;
}

export async function insertRsvp(input: InsertRsvp): Promise<Rsvp> {
  const doc: Rsvp = {
    ...input,
    phone: input.phone ?? null,
    note: input.note ?? null,
    additionalGuests: input.additionalGuests.map((guest) => ({
      name: guest.name,
      asoebiSelections: guest.asoebiSelections,
    })),
    id: await nextSequence("rsvps"),
    createdAt: new Date(),
  };
  await rsvpsCollection().insertOne(doc);
  return doc;
}

export async function updateRsvp(id: number, input: InsertRsvp): Promise<Rsvp | null> {
  return rsvpsCollection().findOneAndUpdate(
    { id },
    {
      $set: {
        ...input,
        phone: input.phone ?? null,
        note: input.note ?? null,
        additionalGuests: input.additionalGuests.map((guest) => ({
          name: guest.name,
          asoebiSelections: guest.asoebiSelections,
        })),
      },
    },
    { returnDocument: "after" },
  );
}

export async function insertOrder(input: InsertOrder): Promise<Order> {
  const doc: Order = {
    ...input,
    id: await nextSequence("orders"),
    createdAt: new Date(),
  };
  await ordersCollection().insertOne(doc);
  return doc;
}

export async function updateOrderFulfillment(
  id: number,
  status: "pending" | "delivered",
): Promise<Order | null> {
  return ordersCollection().findOneAndUpdate(
    { id },
    { $set: { fulfillmentStatus: status, fulfilledAt: status === "delivered" ? new Date() : null } },
    { returnDocument: "after" },
  );
}

/** Marks an order delivered by its payment reference, e.g. from a courier webhook. */
export async function markOrderDeliveredByReference(reference: string): Promise<Order | null> {
  return ordersCollection().findOneAndUpdate(
    { reference },
    { $set: { fulfillmentStatus: "delivered", fulfilledAt: new Date() } },
    { returnDocument: "after" },
  );
}

export async function upsertPaymentConfig(
  input: Omit<PaymentConfig, "id" | "updatedAt">,
): Promise<PaymentConfig> {
  const result = await paymentConfigsCollection().findOneAndUpdate(
    { id: 1 },
    { $set: { ...input, updatedAt: new Date() }, $setOnInsert: { id: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return result!;
}

export async function upsertDeliveryConfig(
  input: Omit<DeliveryConfig, "id" | "updatedAt">,
): Promise<DeliveryConfig> {
  const result = await deliveryConfigsCollection().findOneAndUpdate(
    { id: 1 },
    { $set: { ...input, updatedAt: new Date() }, $setOnInsert: { id: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return result!;
}

export async function upsertNotificationConfig(
  input: Omit<NotificationConfig, "id" | "updatedAt">,
): Promise<NotificationConfig> {
  const result = await notificationConfigsCollection().findOneAndUpdate(
    { id: 1 },
    { $set: { ...input, updatedAt: new Date() }, $setOnInsert: { id: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return result!;
}

export async function upsertSiteSettings(
  input: Partial<Omit<SiteSettings, "id" | "updatedAt">>,
): Promise<SiteSettings> {
  const missingDefaults = Object.fromEntries(
    Object.entries(DEFAULT_SITE_SETTINGS).filter(([key]) => !(key in input)),
  );
  const result = await siteSettingsCollection().findOneAndUpdate(
    { id: 1 },
    {
      $set: { ...input, updatedAt: new Date() },
      $setOnInsert: { id: 1, ...missingDefaults },
    },
    { upsert: true, returnDocument: "after" },
  );
  return result!;
}
