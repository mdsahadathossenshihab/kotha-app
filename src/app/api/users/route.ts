import { and, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser, publicUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();

  const rows = await db
    .select()
    .from(users)
    .where(
      q
        ? and(ne(users.id, me.id), or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)))
        : ne(users.id, me.id),
    )
    .orderBy(sql`${users.lastSeen} desc`)
    .limit(40);

  return Response.json({ users: rows.map(publicUser) });
}
