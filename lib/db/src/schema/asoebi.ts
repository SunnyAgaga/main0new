import {
  boolean,
  decimal,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const asoebiItemsTable = pgTable("asoebi_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  imageUrl: text("image_url").notNull(),
  sizes: text("sizes").array().notNull(),
  available: boolean("available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rsvpsTable = pgTable("rsvps", {
  id: serial("id").primaryKey(),
  guestName: text("guest_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  attending: boolean("attending").notNull(),
  guestCount: integer("guest_count").notNull().default(1),
  asoebiInterest: text("asoebi_interest").notNull(),
  asoebiItemId: integer("asoebi_item_id").references(() => asoebiItemsTable.id),
  asoebiSize: text("asoebi_size"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentConfigsTable = pgTable("payment_configs", {
  id: integer("id").primaryKey().default(1),
  flutterwaveEnabled: boolean("flutterwave_enabled").notNull().default(false),
  flutterwaveSecretKey: text("flutterwave_secret_key").notNull().default(""),
  bankTransferEnabled: boolean("bank_transfer_enabled").notNull().default(false),
  bankName: text("bank_name").notNull().default(""),
  accountName: text("account_name").notNull().default(""),
  accountNumber: text("account_number").notNull().default(""),
  bankInstructions: text("bank_instructions").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  rsvpId: integer("rsvp_id")
    .notNull()
    .references(() => rsvpsTable.id),
  asoebiItemId: integer("asoebi_item_id")
    .notNull()
    .references(() => asoebiItemsTable.id),
  size: text("size").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAsoebiItemSchema = createInsertSchema(asoebiItemsTable).omit({
  id: true,
  createdAt: true,
});
export const insertRsvpSchema = createInsertSchema(rsvpsTable).omit({
  id: true,
  createdAt: true,
});
export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
});

export type InsertAsoebiItem = typeof asoebiItemsTable.$inferInsert;
export type AsoebiItem = typeof asoebiItemsTable.$inferSelect;
export type InsertRsvp = typeof rsvpsTable.$inferInsert;
export type Rsvp = typeof rsvpsTable.$inferSelect;
export type InsertOrder = typeof ordersTable.$inferInsert;
export type Order = typeof ordersTable.$inferSelect;
