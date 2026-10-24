import { desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { calls, users } from "@/db/schema";
import { getCurrentUser, publicUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const rows = await db
    .select({ call: calls, caller: users })
    .from(calls)
    .innerJoin(users, eq(users.id, calls.callerId))
    .where(or(eq(calls.callerId, me.id), eq(calls.calleeId, me.id)))
    .orderBy(desc(calls.id))
    .limit(50);

  const otherIds = Array.from(
    new Set(rows.map((r) => (r.call.callerId === me.id ? r.call.calleeId : r.call.callerId))),
  );
  const peers = otherIds.length
    ? await db.select().from(users).where(or(...otherIds.map((id) => eq(users.id, id))))
    : [];
  const peerMap = new Map(peers.map((p) => [p.id, publicUser(p)]));

  return Response.json({
    calls: rows.map((r) => {
      const peerId = r.call.callerId === me.id ? r.call.calleeId : r.call.callerId;
      const answered = r.call.answeredAt ? new Date(r.call.answeredAt).getTime() : 0;
      const ended = r.call.endedAt ? new Date(r.call.endedAt).getTime() : 0;
      return {
        id: r.call.id,
        status: r.call.status,
        role: r.call.callerId === me.id ? "caller" : "callee",
        startedAt: r.call.startedAt,
        answeredAt: r.call.answeredAt,
        endedAt: r.call.endedAt,
        durationSec: answered && ended ? Math.max(0, Math.round((ended - answered) / 1000)) : 0,
        peer: peerMap.get(peerId) ?? null,
      };
    }),
  });
}
