import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { normalizeEmail } from "@/lib/email";
import { isMailConfigured, loadMailConfig, sendMail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const rows = await db
    .select()
    .from(invites)
    .where(eq(invites.inviterId, me.id))
    .orderBy(desc(invites.id))
    .limit(50);

  return Response.json({
    invites: rows.map((r) => ({
      id: r.id,
      email: r.email,
      channel: r.channel,
      joined: Boolean(r.joinedUserId),
      createdAt: r.createdAt,
    })),
  });
}

function inviteTemplate(fromName: string, link: string) {
  return `<!doctype html>
<html lang="bn"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#eef5f9;font-family:'Hind Siliguri',Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(2,32,56,.08)">
    <div style="background:linear-gradient(135deg,#0ea5e9,#06b6d4);padding:26px;text-align:center;color:#fff">
      <div style="font-size:28px;font-weight:700">কথা</div>
      <div style="opacity:.9;font-size:14px;margin-top:4px">মেসেজ ও ফ্রি অডিও কল</div>
    </div>
    <div style="padding:26px;color:#0f172a">
      <p style="margin:0 0 14px;font-size:15px;line-height:1.8">
        <b>${fromName}</b> আপনাকে <b>কথা</b> অ্যাপে আমন্ত্রণ জানিয়েছেন।
        এখানে বিনামূল্যে মেসেজ পাঠানো আর ইন্টারনেটে অডিও কল করা যায় — পুরোটাই বাংলায়।
      </p>
      <div style="text-align:center;margin:22px 0">
        <a href="${link}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:13px 28px;border-radius:12px;font-weight:700">
          অ্যাপটি ইনস্টল করুন
        </a>
      </div>
      <p style="margin:0;color:#64748b;font-size:13px;line-height:1.7">
        শুধু আপনার জিমেইল দিয়ে অ্যাকাউন্ট খুলুন — পাসওয়ার্ড লাগবে না।
        অ্যাকাউন্ট খোলার সাথে সাথেই ${fromName} আপনার কন্টাক্টে যুক্ত হয়ে যাবে।
      </p>
    </div>
  </div>
</body></html>`;
}

/** আমন্ত্রণ পাঠানো — সরাসরি ইমেইলে */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const body = (await request.json()) as { email?: string; channel?: string; link?: string };
  const email = normalizeEmail(body.email ?? "");
  if (!email) return Response.json({ error: "সঠিক ইমেইল ঠিকানা দিন" }, { status: 400 });

  const channel = ["email", "link", "share"].includes(body.channel ?? "")
    ? (body.channel as string)
    : "email";

  const existing = await db
    .select()
    .from(invites)
    .where(and(eq(invites.inviterId, me.id), eq(invites.email, email)))
    .limit(1);

  if (existing[0]) {
    await db.update(invites).set({ channel }).where(eq(invites.id, existing[0].id));
  } else {
    await db.insert(invites).values({ inviterId: me.id, email, channel });
  }

  // ইমেইলে আমন্ত্রণ পাঠানোর চেষ্টা
  let delivered = false;
  let error = "";
  if (channel === "email") {
    const cfg = await loadMailConfig();
    if (isMailConfigured(cfg)) {
      const link = body.link || "";
      const result = await sendMail(
        email,
        `${me.name} আপনাকে "কথা" অ্যাপে আমন্ত্রণ জানিয়েছেন`,
        inviteTemplate(me.name, link),
        `${me.name} আপনাকে কথা অ্যাপে আমন্ত্রণ জানিয়েছেন। ইনস্টল করুন: ${link}`,
        cfg,
      );
      delivered = result.delivered;
      error = result.error ?? "";
    } else {
      error = "ইমেইল সার্ভিস যুক্ত করা হয়নি";
    }
  }

  return Response.json(
    {
      ok: true,
      delivered,
      message: delivered
        ? `✅ ${email} ঠিকানায় আমন্ত্রণ পাঠানো হয়েছে`
        : `আমন্ত্রণ সংরক্ষণ হয়েছে${error ? ` (ইমেইল যায়নি — ${error})` : ""}`,
    },
    { status: 201 },
  );
}
