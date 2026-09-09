import { db } from "./client";

interface Counter {
  _id: string;
  seq: number;
}

export async function nextSequence(name: string): Promise<number> {
  const result = await db.collection<Counter>("counters").findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );

  return result!.seq;
}
