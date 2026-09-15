// Sends transactional email over SMTP; logs and skips when SMTP isn't configured.
import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export const sendEmail = async (to: string, subject: string, html: string) => {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn("SMTP is not configured; skipping email", { to, subject });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  await transporter.sendMail({ from: env.EMAIL_FROM ?? env.SMTP_USER, to, subject, html });
};
