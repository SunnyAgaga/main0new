import nodemailer from "nodemailer";
import { logger } from "./logger";

export async function sendSmtpEmail(params: {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const transporter = nodemailer.createTransport({
    host: params.host,
    port: params.port,
    secure: params.port === 465,
    auth: { user: params.username, pass: params.password },
    // Fail fast rather than hanging: a firewalled port or unreachable host
    // can otherwise leave the request open long enough for the reverse
    // proxy in front of this app to give up first and return its own
    // error page instead of the real JSON response.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  try {
    await transporter.sendMail({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
    return true;
  } catch (err) {
    // Swallowed from callers' return value on purpose (they just need a
    // pass/fail), but logged here since this is the only place that still
    // has the real SMTP failure reason (bad auth, blocked port, TLS, etc).
    logger.error({ host: params.host, port: params.port, err }, "SMTP send failed");
    return false;
  }
}
