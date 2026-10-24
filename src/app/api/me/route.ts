import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser, publicUser, unauthorized } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  await db.update(users).set({ lastSeen: new Date() }).where(eq(users.id, user.id));
  return Response.json({ user: publicUser(user) });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = (await request.json()) as {
    name?: string;
    about?: string;
    avatar?: string;
    color?: string;
    phone?: string;
  };

  const patch: Record<string, string> = {};
  if (typeof body.name === "string" && body.name.trim().length >= 2) {
    patch.name = body.name.trim().slice(0, 80);
  }
  if (typeof body.phone === "string") {
    const phone = normalizePhone(body.phone);
    if (phone === null) {
      return Response.json({ error: "সঠিক মোবাইল নম্বর দিন (যেমনঃ ০১৭১২৩৪৫৬৭৮)" }, { status: 400 });
    }
    patch.phone = phone;
  }
  if (typeof body.about === "string") patch.about = body.about.trim().slice(0, 160);
  if (typeof body.color === "string") patch.color = body.color.slice(0, 16);
  if (typeof body.avatar === "string") {
    if (body.avatar.length > 700_000) {
      return Response.json({ error: "ছবিটি খুব বড়, ছোট ছবি দিন" }, { status: 413 });
    }
    patch.avatar = body.avatar;
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "পরিবর্তন করার কিছু পাওয়া যায়নি" }, { status: 400 });
  }

  const updated = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, user.id))
    .returning();

  return Response.json({ user: publicUser(updated[0]) });
}
