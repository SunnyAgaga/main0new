import { asoebiItemsCollection, ordersCollection, type Order, type Rsvp } from "@/db";

export interface ResumeLineItem {
  guestName: string;
  itemId: number;
  name: string;
  size: string;
  quantity: number;
  amount: number;
}

/**
 * Rebuilds a guest's Aso Ebi order straight from their RSVP's own stored
 * selections (never trusting a client-provided list), resolving each item's
 * current name/price from the catalog. An item removed from the catalog
 * since RSVP time is skipped rather than shown with stale pricing.
 */
export async function resolveRsvpAsoebiOrder(
  rsvp: Rsvp,
): Promise<{ items: ResumeLineItem[]; totalAmount: number; currency: string }> {
  const selections = [
    ...rsvp.asoebiSelections.map((s) => ({ guestName: rsvp.guestName, ...s })),
    ...rsvp.additionalGuests.flatMap((guest) =>
      guest.asoebiSelections.map((s) => ({ guestName: guest.name, ...s })),
    ),
  ];

  const items: ResumeLineItem[] = [];
  let totalAmount = 0;
  let currency = "NGN";

  for (const selection of selections) {
    const item = await asoebiItemsCollection().findOne({ id: selection.asoebiItemId });
    if (!item) continue;

    const amount = item.price * selection.quantity;
    items.push({
      guestName: selection.guestName,
      itemId: item.id,
      name: item.name,
      size: selection.asoebiSize,
      quantity: selection.quantity,
      amount,
    });
    totalAmount += amount;
    currency = item.currency;
  }

  return { items, totalAmount, currency };
}

/** The most recent asoebi order tied to this RSVP, if the guest has started one. */
export async function findExistingAsoebiOrder(rsvpId: number): Promise<Order | null> {
  return ordersCollection().findOne(
    { rsvpId, type: "asoebi" },
    { sort: { createdAt: -1 } },
  );
}
