import { and, asc, eq, gt, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { callSignals, calls } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function assertMember(callId: number, userId: number) {
  const rows = await db
    .select()
    .from(calls)
    .where(
      and(eq(calls.id, callId), or(eq(calls.callerId, userId), eq(calls.calleeId, userId))),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await context.params;
  const callId = Number(id);
  if (!(await assertMember(callId, me.id))) {
    return Response.json({ error: "কল পাওয়া যায়নি" }, { status: 404 });
  }

  const after = Number(new URL(request.url).searchParams.get("after") ?? 0);
  const rows = await db
    .select()
    .from(callSignals)
    .where(
      and(
        eq(callSignals.callId, callId),
        ne(callSignals.senderId, me.id),
        gt(callSignals.id, after),
      ),
    )
    .orderBy(asc(callSignals.id))
    .limit(100);

  return Response.json({ signals: rows });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await context.params;
  const callId = Number(id);
  if (!(await assertMember(callId, me.id))) {
    return Response.json({ error: "কল পাওয়া যায়নি" }, { status: 404 });
  }

  const body = (await request.json()) as { kind?: string; payload?: unknown };
  const kind = body.kind ?? "";
  if (!["offer", "answer", "candidate"].includes(kind)) {
    return Response.json({ error: "ভুল সিগন্যাল" }, { status: 400 });
  }

  const created = await db
    .insert(callSignals)
    .values({ callId, senderId: me.id, kind, payload: JSON.stringify(body.payload ?? null) })
    .returning();

  return Response.json({ signal: created[0] }, { status: 201 });
}
