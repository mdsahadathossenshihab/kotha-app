import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts, users } from "@/db/schema";
import { getCurrentUser, publicUser, unauthorized } from "@/lib/auth";
import { ensureContact } from "@/lib/chat";
import { normalizeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const rows = await db
    .select({ user: users })
    .from(contacts)
    .innerJoin(users, eq(users.id, contacts.contactId))
    .where(eq(contacts.ownerId, me.id))
    .orderBy(users.name);

  return Response.json({ contacts: rows.map((r) => publicUser(r.user)) });
}

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const body = (await request.json()) as { email?: string; userId?: number };

  let targetId = body.userId ?? 0;
  if (!targetId && body.email) {
    const clean = normalizeEmail(body.email);
    if (!clean) return Response.json({ error: "সঠিক ইমেইল ঠিকানা দিন" }, { status: 400 });
    const found = await db.select().from(users).where(eq(users.email, clean)).limit(1);
    if (!found[0]) {
      return Response.json(
        { error: "এই ইমেইলে কথা অ্যাপে কোনো অ্যাকাউন্ট নেই — আমন্ত্রণ পাঠান", notFound: true },
        { status: 404 },
      );
    }
    targetId = found[0].id;
  }

  if (!targetId || targetId === me.id) {
    return Response.json({ error: "সঠিক ব্যবহারকারী নির্বাচন করুন" }, { status: 400 });
  }

  await ensureContact(me.id, targetId);
  await ensureContact(targetId, me.id);

  const saved = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  return Response.json({ contact: publicUser(saved[0]) }, { status: 201 });
}

export async function DELETE(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const id = Number(new URL(request.url).searchParams.get("id") ?? 0);
  if (!id) return Response.json({ error: "আইডি দরকার" }, { status: 400 });
  await db
    .delete(contacts)
    .where(and(eq(contacts.ownerId, me.id), eq(contacts.contactId, id)));
  return Response.json({ ok: true });
}
