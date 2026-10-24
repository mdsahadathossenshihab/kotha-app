import { createHash } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { otpCodes, users } from "@/db/schema";
import { emailProviderName, inboxUrl, maskEmail, normalizeEmail } from "@/lib/email";
import { isMailConfigured, loadMailConfig, otpTemplate, sendMail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const hashCode = (email: string, code: string) =>
  createHash("sha256").update(`${email}:${code}:kotha-otp`).digest("hex");

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = normalizeEmail(body.email ?? "");

    if (!email) {
      return Response.json(
        { error: "সঠিক ইমেইল ঠিকানা লিখুন (যেমনঃ nam@gmail.com)" },
        { status: 400 },
      );
    }

    // এক মিনিটে ৫ বারের বেশি কোড চাওয়া যাবে না
    const recent = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(otpCodes)
      .where(
        and(eq(otpCodes.email, email), gt(otpCodes.createdAt, new Date(Date.now() - 60_000))),
      );
    if ((recent[0]?.count ?? 0) >= 5) {
      return Response.json(
        { error: "অনেকবার চেষ্টা করা হয়েছে, এক মিনিট পরে আবার চেষ্টা করুন" },
        { status: 429 },
      );
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const isNewUser = !existing[0];

    const cfg = await loadMailConfig();
    const ready = isMailConfigured(cfg);
    const code = String(Math.floor(100000 + Math.random() * 900000));

    let delivered = false;
    if (ready) {
      const result = await sendMail(
        email,
        `কথা অ্যাপ — আপনার ভেরিফিকেশন কোড ${code}`,
        otpTemplate(code, isNewUser),
        `কথা অ্যাপের ভেরিফিকেশন কোড: ${code} (১০ মিনিট বৈধ)। কাউকে কোডটি দেবেন না।`,
        cfg,
      );
      delivered = result.delivered;
    }

    // ইমেইল সার্ভিস না থাকলে (বা পাঠাতে ব্যর্থ হলে) কোডটি অ্যাপেই দেখানো হয়,
    // যাতে কোনো ব্যবহারকারী কখনো আটকে না যান।
    await db.insert(otpCodes).values({
      email,
      codeHash: hashCode(email, code),
      channel: delivered ? cfg.provider : "instant",
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });

    return Response.json({
      ok: true,
      email,
      maskedEmail: maskEmail(email),
      mailProvider: emailProviderName(email),
      inboxUrl: inboxUrl(email),
      isNewUser,
      name: existing[0]?.name ?? null,
      delivered,
      instantCode: delivered ? null : code,
    });
  } catch {
    return Response.json({ error: "কোড তৈরি করা যায়নি, আবার চেষ্টা করুন" }, { status: 500 });
  }
}
