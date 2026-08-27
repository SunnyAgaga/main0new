import { MongoClient, type Collection, type Db, type Document } from "mongodb";
import type {
  AsoEbiItem,
  AsoEbiOrder,
  Guest,
  NotificationCampaign,
  Wedding,
} from "./schema";

interface Counter extends Document {
  _id: string;
  sequence: number;
}

export interface MongoCollections {
  weddings: Collection<Wedding>;
  guests: Collection<Guest>;
  notificationCampaigns: Collection<NotificationCampaign>;
  asoEbiItems: Collection<AsoEbiItem>;
  asoEbiOrders: Collection<AsoEbiOrder>;
  counters: Collection<Counter>;
}

let clientPromise: Promise<MongoClient> | null = null;

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error(
      "MONGODB_URI must be set before starting the WedPlan backend.",
    );
  }
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new Error(
      "MONGODB_URI must start with mongodb:// or mongodb+srv://.",
    );
  }
  return uri;
}

export function getMongoDatabaseName(): string {
  return process.env.MONGODB_DB_NAME?.trim() || "wedplan";
}

async function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const client = new MongoClient(getMongoUri(), {
      serverSelectionTimeoutMS: 10_000,
    });
    clientPromise = client.connect().catch((error: unknown) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

export async function getMongoDatabase(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(getMongoDatabaseName());
}

export async function getCollections(): Promise<MongoCollections> {
  const database = await getMongoDatabase();
  return {
    weddings: database.collection<Wedding>("weddings"),
    guests: database.collection<Guest>("guests"),
    notificationCampaigns:
      database.collection<NotificationCampaign>("notification_campaigns"),
    asoEbiItems: database.collection<AsoEbiItem>("aso_ebi_items"),
    asoEbiOrders: database.collection<AsoEbiOrder>("aso_ebi_orders"),
    counters: database.collection<Counter>("counters"),
  };
}

export async function initializeMongoDatabase(): Promise<void> {
  const collections = await getCollections();
  await Promise.all([
    collections.weddings.createIndex({ id: 1 }, { unique: true }),
    collections.guests.createIndex({ id: 1 }, { unique: true }),
    collections.guests.createIndex(
      { email: 1 },
      {
        unique: true,
        partialFilterExpression: { email: { $type: "string" } },
      },
    ),
    collections.notificationCampaigns.createIndex(
      { id: 1 },
      { unique: true },
    ),
    collections.asoEbiItems.createIndex({ id: 1 }, { unique: true }),
    collections.asoEbiItems.createIndex({ name: 1 }, { unique: true }),
    collections.asoEbiOrders.createIndex({ id: 1 }, { unique: true }),
    collections.asoEbiOrders.createIndex(
      { paymentReference: 1 },
      {
        unique: true,
        partialFilterExpression: {
          paymentReference: { $type: "string" },
        },
      },
    ),
  ]);
}

export async function nextSequence(name: string): Promise<number> {
  const { counters } = await getCollections();
  const counter = await counters.findOneAndUpdate(
    { _id: name },
    { $inc: { sequence: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  if (!counter) {
    throw new Error(`Could not allocate the next "${name}" identifier.`);
  }
  return counter.sequence;
}

export async function setSequenceAtLeast(
  name: string,
  sequence: number,
): Promise<void> {
  const { counters } = await getCollections();
  await counters.updateOne(
    { _id: name },
    { $max: { sequence } },
    { upsert: true },
  );
}

export async function closeMongoConnection(): Promise<void> {
  if (!clientPromise) return;
  const client = await clientPromise;
  clientPromise = null;
  await client.close();
}