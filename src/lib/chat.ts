import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { contacts, conversations, users } from "@/db/schema";

export async function findOrCreateConversation(a: number, b: number) {
  const [low, high] = a < b ? [a, b] : [b, a];
  const existing = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userAId, low), eq(conversations.userBId, high)))
    .limit(1);
  if (existing[0]) return existing[0];
  const created = await db
    .insert(conversations)
    .values({ userAId: low, userBId: high })
    .returning();
  return created[0];
}

export async function ensureContact(ownerId: number, contactId: number) {
  if (ownerId === contactId) return;
  await db
    .insert(contacts)
    .values({ ownerId, contactId })
    .onConflictDoNothing();
}

export async function getUserById(id: number) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function conversationForUser(conversationId: number, userId: number) {
  const rows = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        or(eq(conversations.userAId, userId), eq(conversations.userBId, userId)),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export function partnerId(
  conv: { userAId: number; userBId: number },
  userId: number,
) {
  return conv.userAId === userId ? conv.userBId : conv.userAId;
}

export function banglaNumber(input: string | number) {
  const map = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(input).replace(/\d/g, (d) => map[Number(d)]);
}
