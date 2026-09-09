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
  giftMessage: string | null;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  createdAt: Date;
}

export const asoebiItemsCollection = () =>
  db.collection<AsoebiItem>("asoebi_items");
export const rsvpsCollection = () => db.collection<Rsvp>("rsvps");
export const paymentConfigsCollection = () =>
  db.collection<PaymentConfig>("payment_configs");
export const ordersCollection = () => db.collection<Order>("orders");

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
  giftMessage: z.string().nullable().default(null),
  totalAmount: z.number(),
  currency: z.string().default("NGN"),
  paymentMethod: z.string(),
  status: z.string().default("pending"),
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

export async function insertOrder(input: InsertOrder): Promise<Order> {
  const doc: Order = {
    ...input,
    id: await nextSequence("orders"),
    createdAt: new Date(),
  };
  await ordersCollection().insertOne(doc);
  return doc;
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
