import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invites, users } from "@/db/schema";
import { getCurrentUser, publicUser, unauthorized } from "@/lib/auth";
import { normalizeEmail } from "@/lib/email";
import { normalizePhone, prettyPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/** ইমেইল দিয়ে খোঁজাঃ অ্যাকাউন্ট থাকলে ব্যবহারকারী, না থাকলে ইনভাইট তথ্য */
export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const url = new URL(request.url);
  const raw = url.searchParams.get("email") ?? url.searchParams.get("q") ?? "";

  // নম্বর দিয়ে খোঁজা
  if (!raw.includes("@")) {
    const phone = normalizePhone(raw);
    if (!phone) return Response.json({ valid: false, error: "সঠিক নম্বর বা ইমেইল লিখুন" });
    const byPhone = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (byPhone[0]) {
      if (byPhone[0].id === me.id) {
        return Response.json({ valid: true, self: true, found: false, phone });
      }
      return Response.json({
        valid: true,
        found: true,
        self: false,
        byPhone: true,
        phone,
        prettyPhone: prettyPhone(phone),
        user: publicUser(byPhone[0]),
      });
    }
    return Response.json({
      valid: true,
      found: false,
      self: false,
      byPhone: true,
      phone,
      prettyPhone: prettyPhone(phone),
    });
  }

  const email = normalizeEmail(raw);

  if (!email) {
    return Response.json({ valid: false, error: "সঠিক ইমেইল ঠিকানা লিখুন" });
  }

  if (email === me.email) {
    return Response.json({ valid: true, self: true, found: false, email });
  }

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (rows[0]) {
    return Response.json({ valid: true, found: true, self: false, email, user: publicUser(rows[0]) });
  }

  const alreadyInvited = await db.select().from(invites).where(eq(invites.email, email)).limit(1);

  return Response.json({
    valid: true,
    found: false,
    self: false,
    email,
    alreadyInvited: Boolean(alreadyInvited[0]),
  });
}
