import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

export const KEYS = {
  provider: "mail_provider", // gmail | smtp | resend | brevo | ""
  gmailUser: "mail_gmail_user",
  gmailPass: "mail_gmail_pass",
  smtpHost: "mail_smtp_host",
  smtpPort: "mail_smtp_port",
  smtpUser: "mail_smtp_user",
  smtpPass: "mail_smtp_pass",
  apiKey: "mail_api_key",
  fromEmail: "mail_from_email",
  fromName: "mail_from_name",
  testMode: "mail_test_mode", // "on" হলে কোড স্ক্রিনে দেখাবে
  adminHash: "admin_passcode_hash",
} as const;

export async function getSetting(key: string): Promise<string> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return rows[0]?.value ?? "";
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await db.select().from(appSettings);
  const map: Record<string, string> = {};
  for (const key of keys) map[key] = rows.find((r) => r.key === key)?.value ?? "";
  return map;
}

export async function setSetting(key: string, value: string) {
  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}
