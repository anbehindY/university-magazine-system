import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const globalForMailer = global as unknown as {
  mailer: Transporter;
};

const transporter =
  globalForMailer.mailer ||
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

if (process.env.NODE_ENV !== "production") globalForMailer.mailer = transporter;

export async function sendMail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  await transporter.sendMail({
    from: `"University Magazine System" <${process.env.SMTP_FROM}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
