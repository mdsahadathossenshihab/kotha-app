import { and, asc, eq, gt, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { getCurrentUser, publicUser, unauthorized } from "@/lib/auth";
import { conversationForUser, getUserById, partnerId } from "@/lib/chat";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const { id } = await context.params;
  const conv = await conversationForUser(Number(id), me.id);
  if (!conv) return Response.json({ error: "চ্যাট পাওয়া যায়নি" }, { status: 404 });

  const after = Number(new URL(request.url).searchParams.get("after") ?? 0);

  const rows = await db
    .select()
    .from(messages)
    .where(
      after
        ? and(eq(messages.conversationId, conv.id), gt(messages.id, after))
        : eq(messages.conversationId, conv.id),
    )
    .orderBy(asc(messages.id))
    .limit(300);

  // সঙ্গীর পাঠানো বার্তাগুলো "দেখা হয়েছে" করে দিই
  await db
    .update(messages)
    .set({ seenAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conv.id),
        ne(messages.senderId, me.id),
        isNull(messages.seenAt),
      ),
    );

  const partner = await getUserById(partnerId(conv, me.id));

  return Response.json({
    messages: rows,
    partner: partner ? publicUser(partner) : null,
    meId: me.id,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const { id } = await context.params;
  const conv = await conversationForUser(Number(id), me.id);
  if (!conv) return Response.json({ error: "চ্যাট পাওয়া যায়নি" }, { status: 404 });

  const body = (await request.json()) as {
    kind?: string;
    body?: string;
    mediaUrl?: string;
    durationSec?: number;
  };

  const kind = ["text", "voice", "call", "image"].includes(body.kind ?? "")
    ? (body.kind as string)
    : "text";
  const text = (body.body ?? "").slice(0, 4000);
  const mediaUrl = body.mediaUrl ?? "";

  if (kind === "text" && !text.trim()) {
    return Response.json({ error: "খালি বার্তা পাঠানো যাবে না" }, { status: 400 });
  }
  if (mediaUrl.length > 3_000_000) {
    return Response.json({ error: "ফাইলটি খুব বড়" }, { status: 413 });
  }

  const created = await db
    .insert(messages)
    .values({
      conversationId: conv.id,
      senderId: me.id,
      kind,
      body: text,
      mediaUrl,
      durationSec: Math.max(0, Math.round(body.durationSec ?? 0)),
    })
    .returning();

  const preview =
    kind === "voice" ? "🎤 ভয়েস বার্তা" : kind === "image" ? "🖼️ ছবি" : text;

  await db
    .update(conversations)
    .set({ lastMessage: preview.slice(0, 120), lastMessageAt: new Date() })
    .where(eq(conversations.id, conv.id));

  return Response.json({ message: created[0] }, { status: 201 });
}
