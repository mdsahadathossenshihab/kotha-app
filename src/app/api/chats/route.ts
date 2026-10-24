import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages, users } from "@/db/schema";
import { getCurrentUser, publicUser, unauthorized } from "@/lib/auth";
import { ensureContact, findOrCreateConversation, getUserById } from "@/lib/chat";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const rows = await db
    .select({ conv: conversations, partner: users })
    .from(conversations)
    .innerJoin(
      users,
      or(
        and(eq(conversations.userAId, me.id), eq(users.id, conversations.userBId)),
        and(eq(conversations.userBId, me.id), eq(users.id, conversations.userAId)),
      ),
    )
    .where(or(eq(conversations.userAId, me.id), eq(conversations.userBId, me.id)))
    .orderBy(desc(conversations.lastMessageAt));

  const unread = await db
    .select({
      conversationId: messages.conversationId,
      count: sql<number>`count(*)::int`,
    })
    .from(messages)
    .where(and(ne(messages.senderId, me.id), isNull(messages.seenAt)))
    .groupBy(messages.conversationId);

  const unreadMap = new Map(unread.map((u) => [u.conversationId, u.count]));

  return Response.json({
    chats: rows.map((r) => ({
      id: r.conv.id,
      lastMessage: r.conv.lastMessage,
      lastMessageAt: r.conv.lastMessageAt,
      unread: unreadMap.get(r.conv.id) ?? 0,
      partner: publicUser(r.partner),
    })),
  });
}

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const body = (await request.json()) as { userId?: number };
  const userId = Number(body.userId ?? 0);
  if (!userId || userId === me.id) {
    return Response.json({ error: "সঠিক ব্যবহারকারী নির্বাচন করুন" }, { status: 400 });
  }
  const partner = await getUserById(userId);
  if (!partner) return Response.json({ error: "ব্যবহারকারী পাওয়া যায়নি" }, { status: 404 });

  await ensureContact(me.id, userId);
  await ensureContact(userId, me.id);
  const conv = await findOrCreateConversation(me.id, userId);

  return Response.json({ chatId: conv.id, partner: publicUser(partner) }, { status: 201 });
}
