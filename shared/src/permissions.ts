export const PERMISSION_KEYS = [
  "site-settings",
  "rsvp-form",
  "rsvps",
  "orders",
  "asoebi",
  "payments",
  "delivery",
  "notifications",
  "music",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "site-settings": "Site Settings",
  "rsvp-form": "RSVP Form",
  rsvps: "RSVPs",
  orders: "Orders",
  asoebi: "Asoebi Catalog",
  payments: "Payment Settings",
  delivery: "Delivery Settings",
  notifications: "Notifications",
  music: "Music",
};

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(value);
}
