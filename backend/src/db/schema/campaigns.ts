import { db } from "../client";
import { nextSequence } from "../counters";

export interface Campaign {
  id: number;
  subject: string;
  message: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: Date;
}

export const campaignsCollection = () => db.collection<Campaign>("campaigns");

export async function insertCampaign(input: {
  subject: string;
  message: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
}): Promise<Campaign> {
  const doc: Campaign = {
    ...input,
    id: await nextSequence("campaigns"),
    createdAt: new Date(),
  };
  await campaignsCollection().insertOne(doc);
  return doc;
}

export async function listCampaigns(): Promise<Campaign[]> {
  return campaignsCollection().find({}).sort({ createdAt: -1 }).toArray();
}
