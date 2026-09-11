import nodemailer from "nodemailer";

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
  });

  try {
    await transporter.sendMail({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
    return true;
  } catch {
    return false;
  }
}
