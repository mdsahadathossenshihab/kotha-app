import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { calls, conversations, messages } from "@/db/schema";
import { getCurrentUser, publicUser, unauthorized } from "@/lib/auth";
import { getUserById } from "@/lib/chat";

export const dynamic = "force-dynamic";

async function loadCall(id: number, userId: number) {
  const rows = await db
    .select()
    .from(calls)
    .where(and(eq(calls.id, id), or(eq(calls.callerId, userId), eq(calls.calleeId, userId))))
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await context.params;
  const call = await loadCall(Number(id), me.id);
  if (!call) return Response.json({ error: "কল পাওয়া যায়নি" }, { status: 404 });
  const otherId = call.callerId === me.id ? call.calleeId : call.callerId;
  const other = await getUserById(otherId);
  return Response.json({
    call: {
      ...call,
      role: call.callerId === me.id ? "caller" : "callee",
      peer: other ? publicUser(other) : null,
    },
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await context.params;
  const call = await loadCall(Number(id), me.id);
  if (!call) return Response.json({ error: "কল পাওয়া যায়নি" }, { status: 404 });

  const body = (await request.json()) as { status?: string };
  const status = body.status ?? "";
  if (!["active", "ended", "rejected"].includes(status)) {
    return Response.json({ error: "ভুল অবস্থা" }, { status: 400 });
  }

  const now = new Date();
  const patch: Record<string, unknown> = { status };
  if (status === "active") patch.answeredAt = now;
  if (status === "ended" || status === "rejected") patch.endedAt = now;

  const updated = await db.update(calls).set(patch).where(eq(calls.id, call.id)).returning();

  const alreadyClosed = ["ended", "rejected", "missed"].includes(call.status);

  if ((status === "ended" || status === "rejected") && !alreadyClosed) {
    const duration = call.answeredAt
      ? Math.max(0, Math.round((now.getTime() - new Date(call.answeredAt).getTime()) / 1000))
      : 0;
    const label = call.answeredAt
      ? "অডিও কল সম্পন্ন"
      : status === "rejected"
        ? "কল গ্রহণ করা হয়নি"
        : "মিসড কল";

    await db.insert(messages).values({
      conversationId: call.conversationId,
      senderId: call.callerId,
      kind: "call",
      body: label,
      durationSec: duration,
      seenAt: now,
    });

    await db
      .update(conversations)
      .set({ lastMessage: `📞 ${label}`, lastMessageAt: now })
      .where(eq(conversations.id, call.conversationId));
  }

  return Response.json({ call: updated[0] });
}
