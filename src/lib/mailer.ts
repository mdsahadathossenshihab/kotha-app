import nodemailer from "nodemailer";
import { db } from "@/db";
import { mailLogs } from "@/db/schema";
import { KEYS, getSettings } from "@/lib/settings";

export type MailConfig = {
  provider: string; // gmail | smtp | resend | brevo | ""
  gmailUser: string;
  gmailPass: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  testMode: boolean;
};

export type MailResult = { delivered: boolean; provider: string; error?: string };

export async function loadMailConfig(): Promise<MailConfig> {
  const s = await getSettings(Object.values(KEYS));

  const provider =
    s[KEYS.provider] ||
    process.env.MAIL_PROVIDER ||
    (process.env.GMAIL_USER ? "gmail" : "") ||
    (process.env.RESEND_API_KEY ? "resend" : "") ||
    (process.env.BREVO_API_KEY ? "brevo" : "") ||
    (process.env.SMTP_HOST ? "smtp" : "");

  return {
    provider,
    gmailUser: s[KEYS.gmailUser] || process.env.GMAIL_USER || "",
    gmailPass: s[KEYS.gmailPass] || process.env.GMAIL_APP_PASSWORD || "",
    smtpHost: s[KEYS.smtpHost] || process.env.SMTP_HOST || "",
    smtpPort: s[KEYS.smtpPort] || process.env.SMTP_PORT || "587",
    smtpUser: s[KEYS.smtpUser] || process.env.SMTP_USER || "",
    smtpPass: s[KEYS.smtpPass] || process.env.SMTP_PASS || "",
    apiKey: s[KEYS.apiKey] || process.env.RESEND_API_KEY || process.env.BREVO_API_KEY || "",
    fromEmail: s[KEYS.fromEmail] || process.env.MAIL_FROM || "",
    fromName: s[KEYS.fromName] || "কথা অ্যাপ",
    testMode: s[KEYS.testMode] === "on",
  };
}

export function isMailConfigured(cfg: MailConfig): boolean {
  if (cfg.provider === "gmail") return Boolean(cfg.gmailUser && cfg.gmailPass);
  if (cfg.provider === "smtp") return Boolean(cfg.smtpHost && cfg.smtpUser && cfg.smtpPass);
  if (cfg.provider === "resend") return Boolean(cfg.apiKey && cfg.fromEmail);
  if (cfg.provider === "brevo") return Boolean(cfg.apiKey && cfg.fromEmail);
  return false;
}

function senderAddress(cfg: MailConfig) {
  if (cfg.provider === "gmail") return cfg.gmailUser;
  if (cfg.provider === "smtp") return cfg.fromEmail || cfg.smtpUser;
  return cfg.fromEmail;
}

/** OTP ইমেইলের সুন্দর HTML */
export function otpTemplate(code: string, isNew: boolean) {
  const title = isNew ? "অ্যাকাউন্ট তৈরি করুন" : "লগইন করুন";
  return `<!doctype html>
<html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#eef5f9;font-family:'Hind Siliguri','Noto Sans Bengali',Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(2,32,56,.08)">
    <div style="background:linear-gradient(135deg,#0ea5e9,#06b6d4);padding:28px 24px;text-align:center;color:#fff">
      <div style="font-size:30px;font-weight:700;letter-spacing:.5px">কথা</div>
      <div style="opacity:.9;font-size:14px;margin-top:4px">মেসেজ ও ফ্রি অডিও কল</div>
    </div>
    <div style="padding:28px 24px;color:#0f172a">
      <h2 style="margin:0 0 8px;font-size:19px">${title}</h2>
      <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.7">
        নিচের ৬ সংখ্যার কোডটি অ্যাপে বসিয়ে আপনার ইমেইল ঠিকানা যাচাই করুন।
      </p>
      <div style="background:#f1f9fe;border:1px dashed #7dd3fc;border-radius:14px;padding:18px;text-align:center">
        <div style="font-size:34px;font-weight:700;letter-spacing:10px;color:#0369a1">${code}</div>
        <div style="margin-top:6px;color:#0284c7;font-size:12px">কোডটি ১০ মিনিট পর্যন্ত বৈধ</div>
      </div>
      <p style="margin:20px 0 0;color:#64748b;font-size:13px;line-height:1.7">
        🔒 নিরাপত্তার জন্য কোডটি কারও সাথে শেয়ার করবেন না। আপনি যদি এই অনুরোধ না করে থাকেন,
        তাহলে ইমেইলটি উপেক্ষা করুন।
      </p>
    </div>
    <div style="padding:16px;text-align:center;background:#f8fafc;color:#94a3b8;font-size:12px">
      © কথা — বাংলাদেশে তৈরি ❤️
    </div>
  </div>
</body></html>`;
}

/** সংরক্ষণের আগে সংযোগ যাচাই — ভুল তথ্য হলে সাথে সাথেই বাংলা বার্তা */
export async function verifyMailConfig(cfg: MailConfig): Promise<{ ok: boolean; error?: string }> {
  if (!isMailConfigured(cfg)) {
    return { ok: false, error: "সব ঘর পূরণ করুন" };
  }

  try {
    if (cfg.provider === "gmail" || cfg.provider === "smtp") {
      const isGmail = cfg.provider === "gmail";
      const port = Number(isGmail ? 465 : cfg.smtpPort || 587);
      const transporter = nodemailer.createTransport({
        host: isGmail ? "smtp.gmail.com" : cfg.smtpHost,
        port,
        secure: port === 465,
        auth: {
          user: isGmail ? cfg.gmailUser : cfg.smtpUser,
          pass: isGmail ? cfg.gmailPass.replace(/\s/g, "") : cfg.smtpPass,
        },
        connectionTimeout: 12_000,
        greetingTimeout: 12_000,
      });
      await transporter.verify();
      return { ok: true };
    }

    if (cfg.provider === "resend") {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: "Resend API কী সঠিক নয়" };
      }
      return { ok: true };
    }

    if (cfg.provider === "brevo") {
      const res = await fetch("https://api.brevo.com/v3/account", {
        headers: { "api-key": cfg.apiKey },
      });
      if (!res.ok) return { ok: false, error: "Brevo API কী সঠিক নয়" };
      return { ok: true };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: translateError(err instanceof Error ? err.message : "সংযোগ করা যায়নি"),
    };
  }
}

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  text: string,
  preloaded?: MailConfig,
): Promise<MailResult> {
  const cfg = preloaded ?? (await loadMailConfig());

  if (!isMailConfigured(cfg)) {
    return { delivered: false, provider: "none", error: "ইমেইল সার্ভিস যুক্ত করা হয়নি" };
  }

  let result: MailResult;
  try {
    if (cfg.provider === "gmail" || cfg.provider === "smtp") {
      result = await sendSmtp(cfg, to, subject, html, text);
    } else if (cfg.provider === "resend") {
      result = await sendResend(cfg, to, subject, html);
    } else {
      result = await sendBrevo(cfg, to, subject, html);
    }
  } catch (err) {
    result = {
      delivered: false,
      provider: cfg.provider,
      error: translateError(err instanceof Error ? err.message : "সংযোগ করা যায়নি"),
    };
  }

  try {
    await db.insert(mailLogs).values({
      email: to,
      provider: result.provider,
      success: result.delivered ? "yes" : "no",
      detail: (result.error ?? "সফলভাবে পাঠানো হয়েছে").slice(0, 500),
    });
  } catch {
    /* লগ রাখতে না পারলেও সমস্যা নেই */
  }

  return result;
}

function translateError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes("invalid login") || msg.includes("username and password not accepted")) {
    return "জিমেইল ঠিকানা বা App Password ভুল হয়েছে";
  }
  if (msg.includes("application-specific password")) {
    return "সাধারণ পাসওয়ার্ড নয় — গুগলের ১৬ অক্ষরের App Password দিতে হবে";
  }
  if (msg.includes("etimedout") || msg.includes("timeout")) return "সার্ভারে সংযোগ করা যায়নি";
  if (msg.includes("enotfound")) return "SMTP হোস্টের ঠিকানা ভুল";
  if (msg.includes("self signed") || msg.includes("certificate")) return "সার্টিফিকেট সমস্যা";
  return raw.slice(0, 180);
}

async function sendSmtp(
  cfg: MailConfig,
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<MailResult> {
  const isGmail = cfg.provider === "gmail";
  const port = Number(isGmail ? 465 : cfg.smtpPort || 587);

  const transporter = nodemailer.createTransport({
    host: isGmail ? "smtp.gmail.com" : cfg.smtpHost,
    port,
    secure: port === 465,
    auth: {
      user: isGmail ? cfg.gmailUser : cfg.smtpUser,
      pass: isGmail ? cfg.gmailPass.replace(/\s/g, "") : cfg.smtpPass,
    },
  });

  await transporter.sendMail({
    from: `"${cfg.fromName || "কথা অ্যাপ"}" <${senderAddress(cfg)}>`,
    to,
    subject,
    text,
    html,
  });

  return { delivered: true, provider: cfg.provider };
}

async function sendResend(
  cfg: MailConfig,
  to: string,
  subject: string,
  html: string,
): Promise<MailResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${cfg.fromName || "কথা অ্যাপ"} <${cfg.fromEmail}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (res.ok) return { delivered: true, provider: "resend" };
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  return { delivered: false, provider: "resend", error: body.message ?? `HTTP ${res.status}` };
}

async function sendBrevo(
  cfg: MailConfig,
  to: string,
  subject: string,
  html: string,
): Promise<MailResult> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": cfg.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: cfg.fromName || "কথা অ্যাপ", email: cfg.fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (res.ok) return { delivered: true, provider: "brevo" };
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  return { delivered: false, provider: "brevo", error: body.message ?? `HTTP ${res.status}` };
}

export const PROVIDER_NAMES: Record<string, string> = {
  gmail: "Gmail (App Password)",
  smtp: "নিজস্ব SMTP সার্ভার",
  resend: "Resend",
  brevo: "Brevo (Sendinblue)",
};
