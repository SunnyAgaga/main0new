import {
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const weddingsTable = pgTable("weddings", {
  id: serial("id").primaryKey(),
  couple: text("couple").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  traditionalDate: date("traditional_date", { mode: "string" })
    .notNull()
    .default("2026-11-13"),
  whiteWeddingDate: date("white_wedding_date", { mode: "string" })
    .notNull()
    .default("2026-11-20"),
  venue: text("venue").notNull(),
  city: text("city").notNull(),
  eyebrow: text("eyebrow").notNull().default("You are cordially invited"),
  venueDescription: text("venue_description")
    .notNull()
    .default("Our celebration will take place at the exquisite venue. Prepare for an evening of joy, rich culture, and unforgettable memories."),
  dressCode: text("dress_code")
    .notNull()
    .default("We invite you to honor our culture in traditional attire or formal evening wear."),
  asoEbiTitle: text("aso_ebi_title").notNull().default("Aso Ebi Collection"),
  asoEbiSubtitle: text("aso_ebi_subtitle")
    .notNull()
    .default("Select your fabric to join the family colors"),
  backgroundImage: text("background_image").notNull().default("uploaded-photo"),
  menuDashboard: text("menu_dashboard").notNull().default("Dashboard"),
  menuGuests: text("menu_guests").notNull().default("Guests & RSVP"),
  menuNotifications: text("menu_notifications").notNull().default("Campaigns"),
  menuAsoEbi: text("menu_aso_ebi").notNull().default("Aso Ebi"),
  menuSettings: text("menu_settings").notNull().default("Settings"),
  paymentDeadline: date("payment_deadline", { mode: "string" })
    .notNull()
    .default("2026-08-31"),
  paymentBank: text("payment_bank").notNull().default("Providus Bank"),
  paymentAccountName: text("payment_account_name").notNull().default("Olutunmbi Iyanoluwa"),
  paymentAccountNumber: text("payment_account_number").notNull().default("6506784864"),
  paymentTransferRemark: text("payment_transfer_remark").notNull().default("Wedding asoebi"),
  paymentInstructions: text("payment_instructions").notNull().default("All reservations must be paid by the payment deadline."),
  paymentMethods: text("payment_methods").array().notNull().default(["paystack_card", "paystack_transfer", "custom_transfer"]),
  notificationChannels: text("notification_channels").array().notNull().default(["email", "sms", "whatsapp"]),
});

export const guestsTable = pgTable("guests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  phone: text("phone").notNull(),
  partySize: integer("party_size").notNull().default(1),
  rsvp: text("rsvp").notNull().default("pending"),
  friendOf: text("friend_of"),
  tags: text("tags").array().notNull().default([]),
  registeredAt: timestamp("registered_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  advice: text("advice").notNull().default(""),
  notes: text("notes").notNull().default(""),
});

export const notificationCampaignsTable = pgTable("notification_campaigns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  channel: text("channel").notNull(),
  audience: text("audience").notNull(),
  status: text("status").notNull().default("draft"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  opens: integer("opens").notNull().default(0),
});

export const asoEbiItemsTable = pgTable("aso_ebi_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  available: integer("available").notNull().default(0),
  image: text("image").notNull(),
});

export const asoEbiOrdersTable = pgTable("aso_ebi_orders", {
  id: serial("id").primaryKey(),
  guestName: text("guest_name").notNull(),
  phone: text("phone").notNull().default(""),
  email: text("email"),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  orderedAt: timestamp("ordered_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  orderMode: text("order_mode").notNull().default("ready_to_pay"),
  paymentMethod: text("payment_method").notNull().default("custom_transfer"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  paymentReference: text("payment_reference"),
  capSize: text("cap_size").notNull().default(""),
  deliveryAddress: text("delivery_address").notNull().default(""),
  notes: text("notes").notNull().default(""),
  proofFileName: text("proof_file_name"),
});

export type Guest = typeof guestsTable.$inferSelect;