import { createHash } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { contacts, invites, otpCodes, users } from "@/db/schema";
import { publicUser, setSession } from "@/lib/auth";
import { normalizeEmail } from "@/lib/email";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

const COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

const hashCode = (email: string, code: string) =>
  createHash("sha256").update(`${email}:${code}:kotha-otp`).digest("hex");

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      code?: string;
      name?: string;
      phone?: string;
      avatar?: string;
    };
    const email = normalizeEmail(body.email ?? "");
    const code = (body.code ?? "").replace(/\D/g, "").trim();

    if (!email) return Response.json({ error: "সঠিক ইমেইল ঠিকানা দিন" }, { status: 400 });
    if (code.length !== 6) {
      return Response.json({ error: "৬ সংখ্যার কোডটি লিখুন" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.email, email), isNull(otpCodes.consumedAt)))
      .orderBy(desc(otpCodes.id))
      .limit(1);

    const otp = rows[0];
    if (!otp) {
      return Response.json({ error: "কোড পাওয়া যায়নি, আবার কোড পাঠান" }, { status: 400 });
    }
    if (new Date(otp.expiresAt).getTime() < Date.now()) {
      return Response.json({ error: "কোডের মেয়াদ শেষ, নতুন কোড নিন" }, { status: 400 });
    }
    if (otp.attempts >= 5) {
      return Response.json({ error: "অনেকবার ভুল হয়েছে, নতুন কোড নিন" }, { status: 429 });
    }
    if (otp.codeHash !== hashCode(email, code)) {
      await db
        .update(otpCodes)
        .set({ attempts: otp.attempts + 1 })
        .where(eq(otpCodes.id, otp.id));
      return Response.json({ error: "কোডটি সঠিক নয়" }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existing[0]) {
      await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id));
      await db.update(users).set({ lastSeen: new Date() }).where(eq(users.id, existing[0].id));
      await setSession(existing[0].id);
      return Response.json({ user: publicUser(existing[0]), isNew: false });
    }

    const name = (body.name ?? "").trim();
    if (name.length < 2) {
      // কোডটি এখনো খরচ হয়নি — নাম পেলে একই কোডেই অ্যাকাউন্ট তৈরি হবে
      return Response.json(
        { error: "নতুন অ্যাকাউন্টের জন্য আপনার নাম লিখুন", needName: true },
        { status: 400 },
      );
    }

    await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id));

    const phone = normalizePhone(body.phone ?? "") ?? "";
    const avatar = (body.avatar ?? "").length > 700_000 ? "" : (body.avatar ?? "");

    const created = await db
      .insert(users)
      .values({
        email,
        name: name.slice(0, 80),
        phone,
        avatar,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      })
      .returning();

    const me = created[0];

    // যারা এই ইমেইলে আমন্ত্রণ পাঠিয়েছিলেন, তাদের সাথে স্বয়ংক্রিয়ভাবে কন্টাক্ট হবে
    const pending = await db.select().from(invites).where(eq(invites.email, email));
    for (const invite of pending) {
      await db
        .insert(contacts)
        .values([
          { ownerId: invite.inviterId, contactId: me.id },
          { ownerId: me.id, contactId: invite.inviterId },
        ])
        .onConflictDoNothing();
      await db.update(invites).set({ joinedUserId: me.id }).where(eq(invites.id, invite.id));
    }

    await setSession(me.id);
    return Response.json({ user: publicUser(me), isNew: true }, { status: 201 });
  } catch {
    return Response.json({ error: "যাচাই করা যায়নি, আবার চেষ্টা করুন" }, { status: 500 });
  }
}
