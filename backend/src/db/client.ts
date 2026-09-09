import { MongoClient, type Db } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error(
    "MONGODB_URI must be set. Did you forget to provision a database?",
  );
}

export const mongoClient = new MongoClient(process.env.MONGODB_URI);
await mongoClient.connect();

if (!process.env.MONGODB_DB) {
  // Without this, mongoClient.db(undefined) silently falls back to the database
  // named in the URI path - or "test" when the URI has none - and the app looks
  // like it works while reading and writing the wrong database.
  throw new Error("MONGODB_DB must be set to the database name.");
}

export const db: Db = mongoClient.db(process.env.MONGODB_DB);

await Promise.all([
  db.collection("users").createIndex({ email: 1 }, { unique: true }),
  db.collection("sessions").createIndex({ token: 1 }, { unique: true }),
  db
    .collection("sessions")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  db.collection("orders").createIndex({ reference: 1 }, { unique: true }),
]);
