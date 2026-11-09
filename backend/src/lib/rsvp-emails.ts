import type { Request } from "express";
import {
  eventDetailsCollection,
  notificationConfigsCollection,
  paymentConfigsCollection,
  siteSettingsCollection,
  DEFAULT_EVENT_DETAILS,
  DEFAULT_SITE_SETTINGS,
  type NotificationConfig,
  type Rsvp,
} from "@/db";
import { sendSmtpEmail } from "./email";
import type { ResumeLineItem } from "./rsvp-resume";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
export function guestOrigin(req: Request): string {
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
          `Directions: ${googleMapsUrl(details.traditionalVenue)}`,
          ``,
          `White Wedding`,
          `${formatEventDateTime(details.weddingDate)}`,
          `${details.weddingVenue}`,
          `Directions: ${googleMapsUrl(details.weddingVenue)}`,
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

function googleMapsUrl(venue: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
}

function invitationVenueCardHtml(params: {
  accentColor: string;
  primaryColor: string;
  label: string;
  dateTime: string;
  venue: string;
  passUrl: string;
}): string {
  return `
    <td width="50%" valign="top" style="padding: 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border: 1px solid ${params.accentColor}33; border-radius: 12px;">
        <tr>
          <td style="padding: 20px; text-align: center;">
            <p style="margin: 0 0 8px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: ${params.primaryColor}; font-family: Georgia, 'Times New Roman', serif;">
              ${escapeHtml(params.label)}
            </p>
            <p style="margin: 0 0 4px; font-size: 14px; color: #44403c; font-family: Arial, Helvetica, sans-serif;">
              ${escapeHtml(params.dateTime)}
            </p>
            <p style="margin: 0 0 16px; font-size: 14px; color: #78716c; font-family: Arial, Helvetica, sans-serif;">
              ${escapeHtml(params.venue)}
            </p>
            <a href="${params.passUrl}" style="display: inline-block; padding: 10px 20px; background: ${params.primaryColor}; color: #ffffff; text-decoration: none; border-radius: 999px; font-size: 13px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">
              View My Pass
            </a>
            <br />
            <a href="${googleMapsUrl(params.venue)}" style="display: inline-block; margin-top: 10px; font-size: 12px; color: ${params.primaryColor}; text-decoration: underline; font-family: Arial, Helvetica, sans-serif;">
              Get Directions
            </a>
          </td>
        </tr>
      </table>
    </td>`;
}

/**
 * The styled invitation email - mirrors the public landing page's look
 * (logo, colors from site settings, serif headings) rather than the plain
 * text of sendGatePassEmail. Carries both venues/dates and the guest's gate
 * pass links, so it doubles as the printable/forwardable "you're in" email
 * sent on demand to a chosen set of already-approved guests.
 */
function buildInvitationHtml(params: {
  rsvp: Rsvp;
  coupleNames: string;
  welcomeMessage: string;
  logoUrl: string;
  logoHeight: number;
  heroImageUrl: string;
  backgroundColor: string;
  primaryColor: string;
  accentColor: string;
  traditional: { dateTime: string; venue: string; passUrl: string };
  wedding: { dateTime: string; venue: string; passUrl: string };
}): string {
  const { rsvp, coupleNames, welcomeMessage, logoUrl, logoHeight, heroImageUrl, backgroundColor, primaryColor, accentColor, traditional, wedding } = params;

  const headerHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(coupleNames)}" height="${logoHeight}" style="height: ${logoHeight}px; max-width: 240px; object-fit: contain;" />`
    : `<p style="margin: 0; font-size: 20px; letter-spacing: 3px; text-transform: uppercase; color: ${primaryColor}; font-family: Georgia, 'Times New Roman', serif;">${escapeHtml(coupleNames)}</p>`;

  const heroHtml = heroImageUrl
    ? `
            <tr>
              <td style="padding: 0;">
                <img src="${escapeHtml(heroImageUrl)}" alt="" width="600" style="width: 100%; max-width: 600px; height: 220px; object-fit: cover; display: block; border-radius: 16px 16px 0 0;" />
              </td>
            </tr>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(coupleNames)}</title>
  </head>
  <body style="margin: 0; padding: 0; background: ${backgroundColor};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${backgroundColor}; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width: 600px;" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding-bottom: 24px;">${headerHtml}</td>
            </tr>
            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px;">
                  ${heroHtml}
                  <tr>
                    <td style="padding: 40px 32px; text-align: center;">
                      <p style="margin: 0 0 12px; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: ${accentColor}; font-family: Arial, Helvetica, sans-serif;">
                        You're Invited
                      </p>
                      <h1 style="margin: 0 0 24px; font-size: 32px; color: #1c1917; font-family: Georgia, 'Times New Roman', serif;">
                        ${escapeHtml(coupleNames)}
                      </h1>

                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          ${invitationVenueCardHtml({ accentColor, primaryColor, label: "Traditional Wedding", ...traditional })}
                          ${invitationVenueCardHtml({ accentColor, primaryColor, label: "White Wedding", ...wedding })}
                        </tr>
                      </table>

                      ${welcomeMessage ? `
                      <p style="margin: 28px 0 0; font-size: 15px; font-style: italic; color: #57534e; font-family: Georgia, 'Times New Roman', serif; line-height: 1.6;">
                        "${escapeHtml(welcomeMessage)}"
                      </p>` : ""}

                      <p style="margin: 28px 0 0; font-size: 14px; color: #78716c; font-family: Arial, Helvetica, sans-serif;">
                        Show the QR code on your pass page at the entrance to be checked in. See you there, ${escapeHtml(rsvp.guestName)}!
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Sent on demand from the RSVPs page, to a chosen set of guests - unlike
 * sendGatePassEmail (fired automatically once per approval), this re-sends
 * the same pass links in the styled template above. Requires the RSVP to
 * already be approved (it reuses the existing pass tokens rather than
 * minting new ones), so it reports why it couldn't send rather than
 * silently no-op'ing, which the bulk-send endpoint surfaces per guest.
 */
export async function sendInvitationEmail(
  req: Request,
  rsvp: Rsvp,
): Promise<{ ok: boolean; reason?: string }> {
  if (!rsvp.attending) return { ok: false, reason: "Guest is not attending" };
  if (!rsvp.traditionalPassToken || !rsvp.weddingPassToken) {
    return { ok: false, reason: "RSVP has not been approved yet" };
  }

  const config = await getEmailConfig();
  if (!config) return { ok: false, reason: "Email sending is not configured" };

  const basePath = (process.env.WEDPLAN_BASE_PATH ?? "").replace(/\/$/, "");
  const origin = guestOrigin(req);
  const traditionalUrl = `${origin}${basePath}/pass/${rsvp.traditionalPassToken}`;
  const weddingUrl = `${origin}${basePath}/pass/${rsvp.weddingPassToken}`;

  const [details, settings] = await Promise.all([
    eventDetailsCollection().findOne({ id: 1 }),
    siteSettingsCollection().findOne({ id: 1 }),
  ]);
  const event = { ...DEFAULT_EVENT_DETAILS, ...details };
  const site = { ...DEFAULT_SITE_SETTINGS, ...settings };

  const html = buildInvitationHtml({
    rsvp,
    coupleNames: event.coupleNames,
    welcomeMessage: event.welcomeMessage,
    logoUrl: site.logoUrl,
    logoHeight: site.logoHeight,
    heroImageUrl: site.heroImageUrl,
    backgroundColor: site.backgroundColor,
    primaryColor: site.primaryColor,
    accentColor: site.accentColor,
    traditional: {
      dateTime: formatEventDateTime(event.traditionalDate),
      venue: event.traditionalVenue,
      passUrl: traditionalUrl,
    },
    wedding: {
      dateTime: formatEventDateTime(event.weddingDate),
      venue: event.weddingVenue,
      passUrl: weddingUrl,
    },
  });

  const text = [
    `Hi ${rsvp.guestName},`,
    ``,
    `You're invited! Here are the full details for ${event.coupleNames}'s wedding:`,
    ``,
    `Traditional Wedding`,
    `${formatEventDateTime(event.traditionalDate)}`,
    `${event.traditionalVenue}`,
    `Directions: ${googleMapsUrl(event.traditionalVenue)}`,
    ``,
    `White Wedding`,
    `${formatEventDateTime(event.weddingDate)}`,
    `${event.weddingVenue}`,
    `Directions: ${googleMapsUrl(event.weddingVenue)}`,
    ``,
    `Show the QR code on either page below at the entrance to be checked in:`,
    `Traditional Wedding pass: ${traditionalUrl}`,
    `White Wedding pass: ${weddingUrl}`,
    ``,
    `See you there!`,
  ].join("\n");

  try {
    const sent = await sendSmtpEmail({
      host: config.smtpHost,
      port: config.smtpPort,
      username: config.smtpUsername,
      password: config.smtpPassword,
      from: config.smtpFromEmail,
      to: rsvp.email,
      subject: `You're invited to ${event.coupleNames}'s wedding`,
      text,
      html,
    });
    return sent ? { ok: true } : { ok: false, reason: "Email failed to send" };
  } catch (err) {
    req.log.warn({ err, rsvpId: rsvp.id }, "Failed to send invitation email");
    return { ok: false, reason: "Email failed to send" };
  }
}

/** Sent on demand from the RSVPs page - nudges a guest who hasn't paid for their Aso Ebi yet. */
export async function sendPaymentReminderEmail(
  req: Request,
  rsvp: Rsvp,
  resumeUrl: string,
  items: ResumeLineItem[],
  totalAmount: number,
  currency: string,
): Promise<boolean> {
  const config = await getEmailConfig();
  if (!config) return false;

  const paymentConfig = await paymentConfigsCollection().findOne({ id: 1 });
  const bankDetailsLines =
    paymentConfig?.bankTransferEnabled && paymentConfig.bankName
      ? [
          ``,
          `Prefer to transfer directly? Our account details:`,
          `${paymentConfig.bankName} — ${paymentConfig.accountName} — ${paymentConfig.accountNumber}`,
          ...(paymentConfig.bankInstructions ? [paymentConfig.bankInstructions] : []),
        ]
      : [];

  const itemLines = items.map(
    (item) => `  ${item.name} (${item.size}) x${item.quantity} — ${currency} ${item.amount.toLocaleString()}`,
  );

  const text = [
    `Hi ${rsvp.guestName},`,
    ``,
    `Just a friendly reminder that your Aso Ebi order is still awaiting payment:`,
    ``,
    ...itemLines,
    ``,
    `Total due: ${currency} ${totalAmount.toLocaleString()}`,
    ``,
    `Complete your payment here: ${resumeUrl}`,
    ...bankDetailsLines,
    ``,
    `Thank you!`,
  ].join("\n");

  try {
    return await sendSmtpEmail({
      host: config.smtpHost,
      port: config.smtpPort,
      username: config.smtpUsername,
      password: config.smtpPassword,
      from: config.smtpFromEmail,
      to: rsvp.email,
      subject: "Reminder: complete your Aso Ebi payment",
      text,
    });
  } catch (err) {
    req.log.warn({ err, rsvpId: rsvp.id }, "Failed to send payment reminder email");
    return false;
  }
}
