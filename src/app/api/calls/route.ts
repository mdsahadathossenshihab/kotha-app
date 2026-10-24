import { and, desc, eq, gt, inArray, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { calls, conversations, messages } from "@/db/schema";
import { getCurrentUser, publicUser, unauthorized } from "@/lib/auth";
import { ensureContact, findOrCreateConversation, getUserById } from "@/lib/chat";

export const dynamic = "force-dynamic";

const RING_WINDOW = 60_000; // রিং সর্বোচ্চ ১ মিনিট
const ACTIVE_WINDOW = 4 * 60 * 60_000; // চলমান কল ৪ ঘণ্টা পর্যন্ত

/** পুরনো ঝুলে থাকা রিং বন্ধ করে মিসড কল হিসেবে চিহ্নিত করে */
async function expireStaleCalls(userId: number) {
  const stale = await db
    .select()
    .from(calls)
    .where(
      and(
        or(eq(calls.callerId, userId), eq(calls.calleeId, userId)),
        eq(calls.status, "ringing"),
      ),
    );

  const now = Date.now();
  for (const c of stale) {
    if (now - new Date(c.startedAt).getTime() < RING_WINDOW) continue;
    await db
      .update(calls)
      .set({ status: "missed", endedAt: new Date() })
      .where(eq(calls.id, c.id));
    await db.insert(messages).values({
      conversationId: c.conversationId,
      senderId: c.callerId,
      kind: "call",
      body: "মিসড কল",
      seenAt: null,
    });
    await db
      .update(conversations)
      .set({ lastMessage: "📞 মিসড কল", lastMessageAt: new Date() })
      .where(eq(conversations.id, c.conversationId));
  }
}

/** চলমান বা আসা কল খোঁজা (পোলিং) */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  await expireStaleCalls(me.id);

  const rows = await db
    .select()
    .from(calls)
    .where(
      and(
        or(eq(calls.callerId, me.id), eq(calls.calleeId, me.id)),
        inArray(calls.status, ["ringing", "active"]),
        gt(calls.startedAt, new Date(Date.now() - ACTIVE_WINDOW)),
      ),
    )
    .orderBy(desc(calls.id))
    .limit(1);

  const call = rows[0];
  if (!call) return Response.json({ call: null });

  // রিং হলে কেবল সাম্প্রতিক কলই দেখানো হয়
  if (
    call.status === "ringing" &&
    Date.now() - new Date(call.startedAt).getTime() > RING_WINDOW
  ) {
    return Response.json({ call: null });
  }

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

/** নতুন কল শুরু */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const body = (await request.json()) as { userId?: number };
  const calleeId = Number(body.userId ?? 0);
  if (!calleeId || calleeId === me.id) {
    return Response.json({ error: "সঠিক ব্যবহারকারী নির্বাচন করুন" }, { status: 400 });
  }

  const peer = await getUserById(calleeId);
  if (!peer) return Response.json({ error: "ব্যবহারকারী পাওয়া যায়নি" }, { status: 404 });

  await expireStaleCalls(calleeId);

  // সঙ্গী অন্য কারও সাথে কথা বলছে কি না
  const peerBusy = await db
    .select()
    .from(calls)
    .where(
      and(
        or(eq(calls.callerId, calleeId), eq(calls.calleeId, calleeId)),
        inArray(calls.status, ["ringing", "active"]),
        ne(calls.callerId, me.id),
        ne(calls.calleeId, me.id),
        gt(calls.startedAt, new Date(Date.now() - RING_WINDOW)),
      ),
    )
    .limit(1);

  if (peerBusy[0]) {
    return Response.json(
      { error: `${peer.name} এখন অন্য একটি কলে ব্যস্ত আছেন` },
      { status: 409 },
    );
  }

  await ensureContact(me.id, calleeId);
  await ensureContact(calleeId, me.id);
  const conv = await findOrCreateConversation(me.id, calleeId);

  // নিজের পুরনো কল বন্ধ
  await db
    .update(calls)
    .set({ status: "ended", endedAt: new Date() })
    .where(
      and(
        or(eq(calls.callerId, me.id), eq(calls.calleeId, me.id)),
        inArray(calls.status, ["ringing", "active"]),
      ),
    );

  const created = await db
    .insert(calls)
    .values({ callerId: me.id, calleeId, conversationId: conv.id, status: "ringing" })
    .returning();

  return Response.json(
    { call: { ...created[0], role: "caller", peer: publicUser(peer) } },
    { status: 201 },
  );
}
