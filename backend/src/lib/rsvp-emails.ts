import type { Request } from "express";
import { eventDetailsCollection, notificationConfigsCollection, type NotificationConfig, type Rsvp } from "@/db";
import { sendSmtpEmail } from "./email";

function formatEventDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

// Mirrors the dev/prod origin split used for Spotify's OAuth redirect: in dev,
// Vite serves the SPA on its own port and proxies /api here, so a link meant
// for the guest's browser has to point at that port, not this API's own.
function guestOrigin(req: Request): string {
  if (process.env.NODE_ENV !== "production" && process.env.FRONTEND_PORT) {
    return `${req.protocol}://${req.hostname}:${process.env.FRONTEND_PORT}`;
  }
  return `${req.protocol}://${req.get("host")}`;
}

async function getEmailConfig(): Promise<NotificationConfig | null> {
  const config = await notificationConfigsCollection().findOne({ id: 1 });
  if (!config?.emailEnabled || !config.smtpHost || !config.smtpUsername || !config.smtpPassword || !config.smtpFromEmail) {
    return null;
  }
  return config;
}

/** Sent immediately on RSVP submission - just confirms it was received, no gate pass yet. */
export async function sendRegistrationReceivedEmail(req: Request, rsvp: Rsvp): Promise<void> {
  if (!rsvp.attending) return;

  const config = await getEmailConfig();
  if (!config) return;

  const text = [
    `Hi ${rsvp.guestName},`,
    ``,
    `Thank you for letting us know you'll be joining us - we've received your RSVP!`,
    `We're reviewing responses and will follow up with your entry pass closer to the date.`,
    ``,
    `See you there!`,
  ].join("\n");

  try {
    await sendSmtpEmail({
      host: config.smtpHost,
      port: config.smtpPort,
      username: config.smtpUsername,
      password: config.smtpPassword,
      from: config.smtpFromEmail,
      to: rsvp.email,
      subject: "We've received your RSVP",
      text,
    });
  } catch (err) {
    req.log.warn({ err, rsvpId: rsvp.id }, "Failed to send RSVP confirmation email");
  }
}

/** Sent once an admin approves the RSVP - this is what actually carries the gate passes. */
export async function sendGatePassEmail(req: Request, rsvp: Rsvp): Promise<void> {
  if (!rsvp.traditionalPassToken || !rsvp.weddingPassToken) return;

  const config = await getEmailConfig();
  if (!config) return;

  const basePath = (process.env.WEDPLAN_BASE_PATH ?? "").replace(/\/$/, "");
  const origin = guestOrigin(req);
  const traditionalUrl = `${origin}${basePath}/pass/${rsvp.traditionalPassToken}`;
  const weddingUrl = `${origin}${basePath}/pass/${rsvp.weddingPassToken}`;

  const details = await eventDetailsCollection().findOne({ id: 1 });

  const text = [
    `Hi ${rsvp.guestName},`,
    ``,
    `Your RSVP has been confirmed! Here are the full details for the day:`,
    ``,
    ...(details
      ? [
          `Traditional Wedding`,
          `${formatEventDateTime(details.traditionalDate)}`,
          `${details.traditionalVenue}`,
          ``,
          `White Wedding`,
          `${formatEventDateTime(details.weddingDate)}`,
          `${details.weddingVenue}`,
          ``,
        ]
      : []),
    `Show the QR code on either page below at the entrance to be checked in:`,
    `Traditional Wedding pass: ${traditionalUrl}`,
    `White Wedding pass: ${weddingUrl}`,
    ``,
    `See you there!`,
  ].join("\n");

  try {
    await sendSmtpEmail({
      host: config.smtpHost,
      port: config.smtpPort,
      username: config.smtpUsername,
      password: config.smtpPassword,
      from: config.smtpFromEmail,
      to: rsvp.email,
      subject: "Your wedding gate passes",
      text,
    });
  } catch (err) {
    req.log.warn({ err, rsvpId: rsvp.id }, "Failed to send gate pass email");
  }
}
