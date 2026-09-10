export async function sendMailgunEmail(params: {
  apiKey: string;
  domain: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const auth = Buffer.from(`api:${params.apiKey}`).toString("base64");
  const response = await fetch(`https://api.mailgun.net/v3/${params.domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
    }),
  });
  return response.ok;
}
