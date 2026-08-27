import type { Filter, OptionalUnlessRequiredId, WithId } from "mongodb";
import {
  getCollections,
  initializeMongoDatabase,
  nextSequence,
} from "./client";
import type {
  AsoEbiItem,
  AsoEbiOrder,
  Guest,
  NotificationCampaign,
  Wedding,
} from "./schema";

type SortDirection = "asc" | "desc";

function withoutMongoId<T extends object>(document: WithId<T> | null): T | null {
  if (!document) return null;
  const { _id: _mongoId, ...value } = document;
  return value as T;
}

const weddingDefaults: Omit<Wedding, "id" | "couple" | "date" | "venue" | "city"> = {
  traditionalDate: "2026-11-13",
  whiteWeddingDate: "2026-11-20",
  eyebrow: "You are cordially invited",
  venueDescription:
    "Our celebration will take place at the exquisite venue. Prepare for an evening of joy, rich culture, and unforgettable memories.",
  dressCode:
    "We invite you to honor our culture in traditional attire or formal evening wear.",
  asoEbiTitle: "Aso Ebi Collection",
  asoEbiSubtitle: "Select your fabric to join the family colors",
  backgroundImage: "uploaded-photo",
  menuDashboard: "Dashboard",
  menuGuests: "Guests & RSVP",
  menuNotifications: "Campaigns",
  menuAsoEbi: "Aso Ebi",
  menuSettings: "Settings",
  paymentDeadline: "2026-08-31",
  paymentBank: "Providus Bank",
  paymentAccountName: "Olutunmbi Iyanoluwa",
  paymentAccountNumber: "6506784864",
  paymentTransferRemark: "Wedding asoebi",
  paymentInstructions:
    "All reservations must be paid by the payment deadline.",
  paymentMethods: ["paystack_card", "paystack_transfer", "custom_transfer"],
  notificationChannels: ["email", "sms", "whatsapp"],
};

export async function findPrimaryWedding(): Promise<Wedding | null> {
  const { weddings } = await getCollections();
  return withoutMongoId(await weddings.findOne({}, { sort: { id: 1 } }));
}

export async function createWedding(
  input: Pick<Wedding, "couple" | "date" | "venue" | "city"> &
    Partial<Omit<Wedding, "id" | "couple" | "date" | "venue" | "city">>,
): Promise<Wedding> {
  const { weddings } = await getCollections();
  const wedding: Wedding = {
    ...weddingDefaults,
    ...input,
    id: await nextSequence("weddings"),
  };
  await weddings.insertOne(wedding as OptionalUnlessRequiredId<Wedding>);
  return wedding;
}

export async function updateWedding(
  id: number,
  changes: Partial<Omit<Wedding, "id">>,
): Promise<Wedding | null> {
  const { weddings } = await getCollections();
  return withoutMongoId(
    await weddings.findOneAndUpdate(
      { id },
      { $set: changes },
      { returnDocument: "after" },
    ),
  );
}

export async function countGuests(): Promise<number> {
  const { guests } = await getCollections();
  return guests.countDocuments();
}

export type NewGuest = Pick<Guest, "name" | "phone"> &
  Partial<Omit<Guest, "id" | "name" | "phone">>;

export async function createGuest(input: NewGuest): Promise<Guest> {
  const { guests } = await getCollections();
  const guest: Guest = {
    id: await nextSequence("guests"),
    name: input.name,
    email: input.email ?? null,
    phone: input.phone,
    partySize: input.partySize ?? 1,
    rsvp: input.rsvp ?? "pending",
    friendOf: input.friendOf ?? null,
    tags: input.tags ?? [],
    registeredAt: input.registeredAt ?? new Date(),
    checkedInAt: input.checkedInAt ?? null,
    advice: input.advice ?? "",
    notes: input.notes ?? "",
  };
  await guests.insertOne(guest as OptionalUnlessRequiredId<Guest>);
  return guest;
}

export async function createGuests(inputs: NewGuest[]): Promise<Guest[]> {
  return Promise.all(inputs.map(createGuest));
}

export async function listGuests(
  direction: SortDirection = "desc",
): Promise<Guest[]> {
  const { guests } = await getCollections();
  const documents = await guests
    .find()
    .sort({ registeredAt: direction === "desc" ? -1 : 1 })
    .toArray();
  return documents.map((document) => withoutMongoId(document)!);
}

export async function findGuestByEmail(email: string): Promise<Guest | null> {
  const { guests } = await getCollections();
  return withoutMongoId(await guests.findOne({ email }));
}

export async function updateGuest(
  id: number,
  changes: Partial<Omit<Guest, "id">>,
): Promise<Guest | null> {
  const { guests } = await getCollections();
  return withoutMongoId(
    await guests.findOneAndUpdate(
      { id },
      { $set: changes },
      { returnDocument: "after" },
    ),
  );
}

export async function countNotificationCampaigns(): Promise<number> {
  const { notificationCampaigns } = await getCollections();
  return notificationCampaigns.countDocuments();
}

export type NewNotificationCampaign = Pick<
  NotificationCampaign,
  "title" | "channel" | "audience"
> &
  Partial<
    Omit<NotificationCampaign, "id" | "title" | "channel" | "audience">
  >;

export async function createNotificationCampaign(
  input: NewNotificationCampaign,
): Promise<NotificationCampaign> {
  const { notificationCampaigns } = await getCollections();
  const campaign: NotificationCampaign = {
    id: await nextSequence("notification_campaigns"),
    title: input.title,
    channel: input.channel,
    audience: input.audience,
    status: input.status ?? "draft",
    sentAt: input.sentAt ?? new Date(),
    opens: input.opens ?? 0,
  };
  await notificationCampaigns.insertOne(
    campaign as OptionalUnlessRequiredId<NotificationCampaign>,
  );
  return campaign;
}

export async function createNotificationCampaigns(
  inputs: NewNotificationCampaign[],
): Promise<NotificationCampaign[]> {
  return Promise.all(inputs.map(createNotificationCampaign));
}

export async function listNotificationCampaigns(): Promise<
  NotificationCampaign[]
> {
  const { notificationCampaigns } = await getCollections();
  const documents = await notificationCampaigns
    .find()
    .sort({ sentAt: -1 })
    .toArray();
  return documents.map((document) => withoutMongoId(document)!);
}

export type NewAsoEbiItem = Omit<AsoEbiItem, "id">;

export async function createAsoEbiItem(
  input: NewAsoEbiItem,
): Promise<AsoEbiItem> {
  const { asoEbiItems } = await getCollections();
  const item: AsoEbiItem = {
    ...input,
    id: await nextSequence("aso_ebi_items"),
  };
  await asoEbiItems.insertOne(item as OptionalUnlessRequiredId<AsoEbiItem>);
  return item;
}

export async function createAsoEbiItems(
  inputs: NewAsoEbiItem[],
): Promise<AsoEbiItem[]> {
  return Promise.all(inputs.map(createAsoEbiItem));
}

export async function listAsoEbiItems(): Promise<AsoEbiItem[]> {
  const { asoEbiItems } = await getCollections();
  const documents = await asoEbiItems.find().sort({ id: 1 }).toArray();
  return documents.map((document) => withoutMongoId(document)!);
}

export async function updateAsoEbiItemByName(
  name: string,
  changes: Partial<Omit<AsoEbiItem, "id">>,
): Promise<AsoEbiItem | null> {
  const { asoEbiItems } = await getCollections();
  return withoutMongoId(
    await asoEbiItems.findOneAndUpdate(
      { name },
      { $set: changes },
      { returnDocument: "after" },
    ),
  );
}

export async function countAsoEbiOrders(): Promise<number> {
  const { asoEbiOrders } = await getCollections();
  return asoEbiOrders.countDocuments();
}

export type NewAsoEbiOrder = Pick<
  AsoEbiOrder,
  "guestName" | "itemName" | "amount"
> &
  Partial<Omit<AsoEbiOrder, "id" | "guestName" | "itemName" | "amount">>;

export async function createAsoEbiOrder(
  input: NewAsoEbiOrder,
): Promise<AsoEbiOrder> {
  const { asoEbiOrders } = await getCollections();
  const order: AsoEbiOrder = {
    id: await nextSequence("aso_ebi_orders"),
    guestName: input.guestName,
    phone: input.phone ?? "",
    email: input.email ?? null,
    itemName: input.itemName,
    quantity: input.quantity ?? 1,
    amount: Number(input.amount),
    status: input.status ?? "pending",
    orderedAt: input.orderedAt ?? new Date(),
    orderMode: input.orderMode ?? "ready_to_pay",
    paymentMethod: input.paymentMethod ?? "custom_transfer",
    paymentStatus: input.paymentStatus ?? "unpaid",
    paymentReference: input.paymentReference ?? null,
    capSize: input.capSize ?? "",
    deliveryAddress: input.deliveryAddress ?? "",
    notes: input.notes ?? "",
    proofFileName: input.proofFileName ?? null,
  };
  await asoEbiOrders.insertOne(
    order as OptionalUnlessRequiredId<AsoEbiOrder>,
  );
  return order;
}

export async function createAsoEbiOrders(
  inputs: NewAsoEbiOrder[],
): Promise<AsoEbiOrder[]> {
  return Promise.all(inputs.map(createAsoEbiOrder));
}

export async function listAsoEbiOrders(
  direction: SortDirection = "desc",
): Promise<AsoEbiOrder[]> {
  const { asoEbiOrders } = await getCollections();
  const documents = await asoEbiOrders
    .find()
    .sort({ orderedAt: direction === "desc" ? -1 : 1 })
    .toArray();
  return documents.map((document) => withoutMongoId(document)!);
}

export async function findAsoEbiOrderById(
  id: number,
): Promise<AsoEbiOrder | null> {
  const { asoEbiOrders } = await getCollections();
  return withoutMongoId(await asoEbiOrders.findOne({ id }));
}

export async function findAsoEbiOrderByPaymentReference(
  paymentReference: string,
): Promise<AsoEbiOrder | null> {
  const { asoEbiOrders } = await getCollections();
  return withoutMongoId(await asoEbiOrders.findOne({ paymentReference }));
}

export async function findAsoEbiOrdersByItemName(
  itemName: string,
): Promise<AsoEbiOrder[]> {
  const { asoEbiOrders } = await getCollections();
  const documents = await asoEbiOrders.find({ itemName }).toArray();
  return documents.map((document) => withoutMongoId(document)!);
}

export async function updateAsoEbiOrder(
  id: number,
  changes: Partial<Omit<AsoEbiOrder, "id">>,
): Promise<AsoEbiOrder | null> {
  const { asoEbiOrders } = await getCollections();
  return withoutMongoId(
    await asoEbiOrders.findOneAndUpdate(
      { id },
      { $set: changes },
      { returnDocument: "after" },
    ),
  );
}

export async function updateAsoEbiOrders(
  filter: Filter<AsoEbiOrder>,
  changes: Partial<Omit<AsoEbiOrder, "id">>,
): Promise<number> {
  const { asoEbiOrders } = await getCollections();
  const result = await asoEbiOrders.updateMany(filter, { $set: changes });
  return result.modifiedCount;
}

export { initializeMongoDatabase };