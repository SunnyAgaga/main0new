export interface Wedding {
  id: number;
  couple: string;
  date: string;
  traditionalDate: string;
  whiteWeddingDate: string;
  venue: string;
  city: string;
  eyebrow: string;
  venueDescription: string;
  dressCode: string;
  asoEbiTitle: string;
  asoEbiSubtitle: string;
  backgroundImage: string;
  menuDashboard: string;
  menuGuests: string;
  menuNotifications: string;
  menuAsoEbi: string;
  menuSettings: string;
  paymentDeadline: string;
  paymentBank: string;
  paymentAccountName: string;
  paymentAccountNumber: string;
  paymentTransferRemark: string;
  paymentInstructions: string;
  paymentMethods: string[];
  notificationChannels: string[];
}

export interface Guest {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  partySize: number;
  rsvp: string;
  friendOf: string | null;
  tags: string[];
  registeredAt: Date;
  checkedInAt: Date | null;
  advice: string;
  notes: string;
}

export interface NotificationCampaign {
  id: number;
  title: string;
  channel: string;
  audience: string;
  status: string;
  sentAt: Date;
  opens: number;
}

export interface AsoEbiItem {
  id: number;
  name: string;
  color: string;
  price: number;
  available: number;
  image: string;
}

export interface AsoEbiOrder {
  id: number;
  guestName: string;
  phone: string;
  email: string | null;
  itemName: string;
  quantity: number;
  amount: number;
  status: string;
  orderedAt: Date;
  orderMode: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentReference: string | null;
  capSize: string;
  deliveryAddress: string;
  notes: string;
  proofFileName: string | null;
}