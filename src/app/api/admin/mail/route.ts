import { desc } from "drizzle-orm";
import { db } from "@/db";
import { mailLogs } from "@/db/schema";
import {
  checkPasscode,
  endAdminSession,
  hasAdminPasscode,
  isAdmin,
  setAdminPasscode,
  startAdminSession,
} from "@/lib/admin";
import {
  PROVIDER_NAMES,
  isMailConfigured,
  loadMailConfig,
  verifyMailConfig,
} from "@/lib/mailer";
import { KEYS, setSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

const mask = (value: string) => (value ? `${value.slice(0, 3)}••••${value.slice(-3)}` : "");

export async function GET() {
  const cfg = await loadMailConfig();
  const admin = await isAdmin();
  const needsPasscode = !(await hasAdminPasscode());

  const logs = admin ? await db.select().from(mailLogs).orderBy(desc(mailLogs.id)).limit(10) : [];

  return Response.json({
    admin,
    needsPasscode,
    configured: isMailConfigured(cfg),
    provider: cfg.provider,
    providerName: PROVIDER_NAMES[cfg.provider] ?? "",
    testMode: cfg.testMode,
    gmailUser: admin ? cfg.gmailUser : "",
    smtpHost: admin ? cfg.smtpHost : "",
    smtpPort: admin ? cfg.smtpPort : "587",
    smtpUser: admin ? cfg.smtpUser : "",
    fromEmail: admin ? cfg.fromEmail : "",
    fromName: admin ? cfg.fromName : "",
    maskedSecret: admin ? mask(cfg.gmailPass || cfg.smtpPass || cfg.apiKey) : "",
    logs: logs.map((l) => ({
      id: l.id,
      email: l.email,
      provider: l.provider,
      success: l.success === "yes",
      detail: l.detail,
      createdAt: l.createdAt,
    })),
  });
}

/** প্রথমবার পাসকোড তৈরি অথবা লগইন */
export async function PUT(request: Request) {
  const body = (await request.json()) as { passcode?: string; action?: string };

  if (body.action === "logout") {
    await endAdminSession();
    return Response.json({ ok: true });
  }

  const passcode = (body.passcode ?? "").trim();
  if (passcode.length < 4) {
    return Response.json({ error: "পাসকোড কমপক্ষে ৪ অক্ষরের হতে হবে" }, { status: 400 });
  }

  if (!(await hasAdminPasscode())) {
    await setAdminPasscode(passcode);
    await startAdminSession();
    return Response.json({ ok: true, created: true });
  }

  if (!(await checkPasscode(passcode))) {
    return Response.json({ error: "পাসকোড ভুল হয়েছে" }, { status: 401 });
  }

  await startAdminSession();
  return Response.json({ ok: true });
}

/** ইমেইল সার্ভিসের কনফিগ সংরক্ষণ */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return Response.json({ error: "অ্যাডমিন হিসেবে লগইন করুন" }, { status: 401 });
  }

  const body = (await request.json()) as {
    provider?: string;
    gmailUser?: string;
    gmailPass?: string;
    smtpHost?: string;
    smtpPort?: string;
    smtpUser?: string;
    smtpPass?: string;
    apiKey?: string;
    fromEmail?: string;
    fromName?: string;
    testMode?: boolean;
  };

  const provider = body.provider ?? "";
  if (!["gmail", "smtp", "resend", "brevo", ""].includes(provider)) {
    return Response.json({ error: "সঠিক সার্ভিস বেছে নিন" }, { status: 400 });
  }

  const put = async (key: string, value: string | undefined, allowEmpty = false) => {
    if (typeof value !== "string") return;
    if (!allowEmpty && !value.trim()) return;
    await setSetting(key, value.trim());
  };

  // আগে সংযোগ যাচাই — ঠিক থাকলে তবেই সংরক্ষণ
  const current = await loadMailConfig();
  const candidate = {
    ...current,
    provider,
    gmailUser: body.gmailUser?.trim() || current.gmailUser,
    gmailPass: body.gmailPass?.trim() || current.gmailPass,
    smtpHost: body.smtpHost?.trim() || current.smtpHost,
    smtpPort: body.smtpPort?.trim() || current.smtpPort,
    smtpUser: body.smtpUser?.trim() || current.smtpUser,
    smtpPass: body.smtpPass?.trim() || current.smtpPass,
    apiKey: body.apiKey?.trim() || current.apiKey,
    fromEmail: body.fromEmail?.trim() || current.fromEmail,
    fromName: body.fromName?.trim() || current.fromName,
  };

  const check = await verifyMailConfig(candidate);
  if (!check.ok) {
    return Response.json(
      { error: check.error ?? "সংযোগ করা যায়নি — তথ্য আবার দেখুন" },
      { status: 400 },
    );
  }

  await setSetting(KEYS.provider, provider);
  await put(KEYS.gmailUser, body.gmailUser, true);
  await put(KEYS.gmailPass, body.gmailPass);
  await put(KEYS.smtpHost, body.smtpHost, true);
  await put(KEYS.smtpPort, body.smtpPort, true);
  await put(KEYS.smtpUser, body.smtpUser, true);
  await put(KEYS.smtpPass, body.smtpPass);
  await put(KEYS.apiKey, body.apiKey);
  await put(KEYS.fromEmail, body.fromEmail, true);
  await put(KEYS.fromName, body.fromName, true);

  const cfg = await loadMailConfig();
  return Response.json({
    ok: true,
    configured: isMailConfigured(cfg),
    provider: cfg.provider,
    message: "✅ সংযোগ সফল! এখন কোড সরাসরি জিমেইলে যাবে।",
  });
}
