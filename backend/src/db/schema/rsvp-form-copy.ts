import { db } from "../client";

export interface RsvpFormCopy {
  id: 1;
  pageTitle: string;
  guestInfoHeading: string;
  fullNameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  attendanceHeading: string;
  attendingQuestion: string;
  attendingYesLabel: string;
  attendingNoLabel: string;
  guestCountLabel: string;
  adultsOnlyNotice: string;
  asoebiQuestion: string;
  asoebiYesLabel: string;
  asoebiNoLabel: string;
  asoebiPickerHint: string;
  additionalGuestsHeading: string;
  deliveryHeading: string;
  deliveryQuestion: string;
  pickupLabel: string;
  deliveryLabel: string;
  deliveryProviderQuestion: string;
  deliveryAddressLabel: string;
  giftHeading: string;
  giftQuestion: string;
  giftYesLabel: string;
  giftNoLabel: string;
  giftAmountLabel: string;
  noteLabel: string;
  submitLabel: string;
  submitWithPaymentLabel: string;
  completeAttendingTitle: string;
  completeAttendingMessage: string;
  completeDecliningTitle: string;
  completeDecliningMessage: string;
  updatedAt: Date;
}

export const DEFAULT_RSVP_FORM_COPY: Omit<RsvpFormCopy, "id" | "updatedAt"> = {
  pageTitle: "RSVP",
  guestInfoHeading: "Guest Information",
  fullNameLabel: "Full Name",
  emailLabel: "Email Address",
  phoneLabel: "Phone Number (Optional)",
  attendanceHeading: "Attendance",
  attendingQuestion: "Will you be attending?",
  attendingYesLabel: "Joyfully Accepts",
  attendingNoLabel: "Regretfully Declines",
  guestCountLabel: "Number of Guests (including yourself, max 3)",
  adultsOnlyNotice:
    "Please note: this is an adults-only celebration. No children allowed, kindly plan accordingly.",
  asoebiQuestion: "Would you like to purchase Asoebi?",
  asoebiYesLabel: "Yes, show me the options",
  asoebiNoLabel: "No, I'll wear my own outfit",
  asoebiPickerHint: "Pick as many items as you like, in any combination, and use +/- to set quantity.",
  additionalGuestsHeading: "Additional Guests",
  deliveryHeading: "Asoebi Delivery",
  deliveryQuestion: "How would you like to receive your order?",
  pickupLabel: "Pick up at the venue",
  deliveryLabel: "Deliver to my address",
  deliveryProviderQuestion: "Choose a delivery service",
  deliveryAddressLabel: "Delivery Address",
  giftHeading: "Send a Gift (Optional)",
  giftQuestion: "Would you also like to send a monetary gift?",
  giftYesLabel: "Yes, I'd like to send a gift",
  giftNoLabel: "No, not right now",
  giftAmountLabel: "Gift Amount (NGN)",
  noteLabel: "Message for the Couple (Optional)",
  submitLabel: "Submit RSVP",
  submitWithPaymentLabel: "Continue to Payment",
  completeAttendingTitle: "We can't wait to see you!",
  completeAttendingMessage: "Your RSVP has been confirmed and your details have been saved.",
  completeDecliningTitle: "You will be missed!",
  completeDecliningMessage: "Thank you for letting us know. We hope to celebrate with you another time.",
};

export const rsvpFormCopyCollection = () =>
  db.collection<RsvpFormCopy>("rsvp_form_copy");

export async function upsertRsvpFormCopy(
  input: Omit<RsvpFormCopy, "id" | "updatedAt">,
): Promise<RsvpFormCopy> {
  const result = await rsvpFormCopyCollection().findOneAndUpdate(
    { id: 1 },
    { $set: { ...input, updatedAt: new Date() }, $setOnInsert: { id: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return result!;
}
