// lib/email/client.ts
// lib/email/client.ts
import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY não configurada");
    _resend = new Resend(key);
  }
  return _resend;
}

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "OrçaZap <onboarding@resend.dev>";
