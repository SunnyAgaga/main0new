import {
  asoebiItemsCollection,
  insertAsoebiItem,
  insertUser,
  mongoClient,
  usersCollection,
} from "@/db";

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? "admin@wedplan.test").toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";

const DEFAULT_ASOEBI_ITEMS = [
  {
    category: "women" as const,
    name: "3 Yards + Gele",
    description: "3 yards of asoebi fabric with a matching gele.",
    price: 65000,
    currency: "NGN",
    imageUrl: "",
    sizes: ["Standard"],
    available: true,
  },
  {
    category: "women" as const,
    name: "4 Yards + Gele",
    description: "4 yards of asoebi fabric with a matching gele.",
    price: 85000,
    currency: "NGN",
    imageUrl: "",
    sizes: ["Standard"],
    available: true,
  },
  {
    category: "women" as const,
    name: "Gele Only",
    description: "Matching gele only, for guests providing their own fabric.",
    price: 15000,
    currency: "NGN",
    imageUrl: "",
    sizes: ["Standard"],
    available: true,
  },
  {
    category: "men" as const,
    name: "Agbada (7 Yards) + Fila",
    description: "7 yards of asoebi fabric for an agbada, with a matching fila.",
    price: 75000,
    currency: "NGN",
    imageUrl: "",
    sizes: ["Standard"],
    available: true,
  },
  {
    category: "men" as const,
    name: "Senator (4 Yards) + Fila",
    description: "4 yards of asoebi fabric for a senator outfit, with a matching fila.",
    price: 45000,
    currency: "NGN",
    imageUrl: "",
    sizes: ["Standard"],
    available: true,
  },
];

async function seedAdmin(): Promise<void> {
  const existing = await usersCollection().findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`[seed] admin user already exists: ${ADMIN_EMAIL}`);
    return;
  }

  await insertUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "admin" });
  console.log(`[seed] created admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

async function seedAsoebi(): Promise<void> {
  const count = await asoebiItemsCollection().countDocuments();
  if (count > 0) {
    console.log(`[seed] asoebi items already exist (${count}), skipping`);
    return;
  }

  for (const item of DEFAULT_ASOEBI_ITEMS) {
    const created = await insertAsoebiItem(item);
    console.log(`[seed] created asoebi item: ${created.name}`);
  }
}

await seedAdmin();
await seedAsoebi();
await mongoClient.close();
