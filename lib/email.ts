type EmailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

// Wrapper Resend — silencieux si EMAIL_API_KEY absent
export async function sendEmail(opts: EmailOptions): Promise<void> {
  if (!process.env.EMAIL_API_KEY) return;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.EMAIL_API_KEY);

  await resend.emails.send({
    from: "Amicale APATS <noreply@apats.ensmg.com>",
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    ...(opts.html ? { html: opts.html } : {}),
  });
}
