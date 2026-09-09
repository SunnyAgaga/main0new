import { MongoClient, type Db } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error(
    "MONGODB_URI must be set. Did you forget to provision a database?",
  );
}

export const mongoClient = new MongoClient(process.env.MONGODB_URI);
await mongoClient.connect();

export const db: Db = mongoClient.db(process.env.MONGODB_DB);

await Promise.all([
  db.collection("users").createIndex({ email: 1 }, { unique: true }),
  db.collection("sessions").createIndex({ token: 1 }, { unique: true }),
  db
    .collection("sessions")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  db.collection("orders").createIndex({ reference: 1 }, { unique: true }),
]);
