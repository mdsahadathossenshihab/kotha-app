import { isAdmin } from "@/lib/admin";
import { normalizeEmail } from "@/lib/email";
import { isMailConfigured, loadMailConfig, otpTemplate, sendMail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return Response.json({ error: "অ্যাডমিন হিসেবে লগইন করুন" }, { status: 401 });
  }

  const body = (await request.json()) as { email?: string };
  const email = normalizeEmail(body.email ?? "");
  if (!email) return Response.json({ error: "সঠিক ইমেইল ঠিকানা দিন" }, { status: 400 });

  const cfg = await loadMailConfig();
  if (!isMailConfigured(cfg)) {
    return Response.json({ error: "আগে সার্ভিসের তথ্য সংরক্ষণ করুন" }, { status: 400 });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const result = await sendMail(
    email,
    "কথা অ্যাপ — টেস্ট ইমেইল",
    otpTemplate(code, true),
    `কথা অ্যাপের টেস্ট বার্তা। নমুনা কোড: ${code}`,
    cfg,
  );

  if (result.delivered) {
    return Response.json({
      ok: true,
      message: `✅ ${email} ঠিকানায় টেস্ট ইমেইল পাঠানো হয়েছে। ইনবক্স (ও Spam ফোল্ডার) দেখুন।`,
    });
  }

  return Response.json(
    { error: `ইমেইল যায়নি — ${result.error ?? "অজানা সমস্যা"}` },
    { status: 400 },
  );
}
