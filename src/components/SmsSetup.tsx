"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

type Status = {
  admin: boolean;
  needsPasscode: boolean;
  configured: boolean;
  provider: string;
  providerName: string;
  gmailUser: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  fromEmail: string;
  fromName: string;
  maskedSecret: string;
  logs: { id: number; email: string; provider: string; success: boolean; detail: string }[];
};

const PROVIDERS = [
  {
    id: "gmail",
    name: "Gmail",
    sub: "নিজের জিমেইল থেকে — সম্পূর্ণ ফ্রি",
    badge: "সবচেয়ে সহজ",
  },
  { id: "resend", name: "Resend", sub: "মাসে ৩,০০০ ইমেইল ফ্রি", badge: "" },
  { id: "brevo", name: "Brevo", sub: "দিনে ৩০০ ইমেইল ফ্রি", badge: "" },
  { id: "smtp", name: "নিজস্ব SMTP", sub: "হোস্টিং বা অন্য সার্ভার", badge: "" },
];

export default function SmsSetup() {
  const [status, setStatus] = useState<Status | null>(null);
  const [passcode, setPasscode] = useState("");
  const [provider, setProvider] = useState("gmail");
  const [gmailUser, setGmailUser] = useState("");
  const [gmailPass, setGmailPass] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("কথা অ্যাপ");
  const [testEmail, setTestEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<Status>("/api/admin/mail");
      setStatus(res);
      if (res.provider) setProvider(res.provider);
      if (res.gmailUser) setGmailUser(res.gmailUser);
      if (res.smtpHost) setSmtpHost(res.smtpHost);
      if (res.smtpPort) setSmtpPort(res.smtpPort);
      if (res.smtpUser) setSmtpUser(res.smtpUser);
      if (res.fromEmail) setFromEmail(res.fromEmail);
      if (res.fromName) setFromName(res.fromName);
    } catch {
      /* উপেক্ষা */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await api<{ created?: boolean }>("/api/admin/mail", {
        method: "PUT",
        body: { passcode },
      });
      setMsg(res.created ? "পাসকোড তৈরি হয়েছে ✅" : "স্বাগতম ✅");
      setPasscode("");
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "সমস্যা হয়েছে");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      const res = await api<{ message?: string }>("/api/admin/mail", {
        method: "POST",
        body: {
          provider,
          gmailUser,
          gmailPass,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          apiKey,
          fromEmail,
          fromName,
        },
      });
      setGmailPass("");
      setSmtpPass("");
      setApiKey("");
      setMsg(res.message ?? "সংরক্ষণ হয়েছে ✅");
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "সংরক্ষণ করা যায়নি");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      const res = await api<{ message: string }>("/api/admin/mail/test", {
        method: "POST",
        body: { email: testEmail },
      });
      setMsg(res.message);
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "টেস্ট পাঠানো যায়নি");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[var(--canvas)]">
      <header className="brand-grad mesh relative px-5 pb-14 pt-8 text-white">
        <div className="relative mx-auto max-w-lg">
          <Link href="/" className="text-sm text-white/80">
            ← হোম
          </Link>
          <h1 className="mt-4 text-[26px] font-bold leading-tight">📬 ইনবক্সে কোড পাঠান</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/90">
            একবার নিজের জিমেইল যুক্ত করলেই ভেরিফিকেশন কোড সরাসরি ব্যবহারকারীর ইনবক্সে চলে যাবে।
            <b> সম্পূর্ণ ফ্রি, ২ মিনিটের কাজ।</b>
          </p>
          {status && (
            <div
              className={`mt-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm backdrop-blur ${
                status.configured ? "bg-emerald-400/25" : "bg-white/18"
              }`}
            >
              {status.configured
                ? `✅ চালু — ${status.providerName}`
                : "⏳ এখনো যুক্ত করা হয়নি (কোড অ্যাপে দেখাচ্ছে)"}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto -mt-9 max-w-lg space-y-4 px-4 pb-16">
        {msg && (
          <p className="card bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {msg}
          </p>
        )}
        {err && (
          <p className="card bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{err}</p>
        )}

        {status && !status.admin && (
          <form onSubmit={unlock} className="card slide-up p-5">
            <h2 className="font-bold">
              {status.needsPasscode ? "🔐 একটি পাসকোড ঠিক করুন" : "🔐 পাসকোড দিন"}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
              {status.needsPasscode
                ? "প্রথমবার যা লিখবেন সেটিই এই পাতার পাসকোড হবে। মনে রাখুন।"
                : "এই পাতা শুধু অ্যাপের মালিকের জন্য।"}
            </p>
            <input
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              type="password"
              placeholder="পাসকোড"
              className="field mt-3"
              required
            />
            <button disabled={busy} className="btn btn-primary mt-3 w-full py-3">
              {status.needsPasscode ? "পাসকোড সেট করুন" : "প্রবেশ করুন"}
            </button>
          </form>
        )}

        {status?.admin && (
          <>
            {/* গাইড */}
            {provider === "gmail" && (
              <section className="card slide-up overflow-hidden">
                <div className="border-b border-[var(--line)] bg-[var(--brand-50)] px-5 py-3">
                  <h2 className="text-sm font-bold text-[var(--brand-700)]">
                    📖 App Password কীভাবে নেবেন (৩ ধাপ)
                  </h2>
                </div>
                <ol className="divide-y divide-[var(--line)]">
                  <GuideStep
                    n="১"
                    title="2-Step Verification চালু করুন"
                    desc="গুগল অ্যাকাউন্টের নিরাপত্তা পাতায় গিয়ে চালু করুন। এটি ছাড়া App Password পাওয়া যায় না।"
                    link="https://myaccount.google.com/signinoptions/two-step-verification"
                    linkText="চালু করুন"
                  />
                  <GuideStep
                    n="২"
                    title="App Password তৈরি করুন"
                    desc="নাম দিন “কথা অ্যাপ” → Create চাপুন → ১৬ অক্ষরের পাসওয়ার্ড কপি করুন।"
                    link="https://myaccount.google.com/apppasswords"
                    linkText="তৈরি করুন"
                  />
                  <GuideStep
                    n="৩"
                    title="নিচে বসিয়ে সংরক্ষণ করুন"
                    desc="সংরক্ষণের সময় সংযোগ যাচাই হবে — ভুল হলে সাথে সাথেই জানিয়ে দেবে।"
                  />
                </ol>
              </section>
            )}

            {/* সার্ভিস */}
            <section className="card p-5">
              <h2 className="text-sm font-bold">সার্ভিস</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                    className={`rounded-xl border-[1.5px] p-3 text-left transition ${
                      provider === p.id
                        ? "border-[var(--brand-400)] bg-[var(--brand-50)]"
                        : "border-[var(--line)] bg-white"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold">{p.name}</span>
                      {p.badge && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                          {p.badge}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-[var(--ink-soft)]">
                      {p.sub}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* তথ্য */}
            <section className="card p-5">
              <h2 className="text-sm font-bold">তথ্য</h2>
              {status.maskedSecret && (
                <p className="mt-1 text-xs text-[var(--ink-soft)]">
                  সংরক্ষিত: <b>{status.maskedSecret}</b> — বদলাতে নতুনটি লিখুন
                </p>
              )}

              {provider === "gmail" && (
                <>
                  <label className="mt-3 block">
                    <span className="label">আপনার জিমেইল</span>
                    <input
                      value={gmailUser}
                      onChange={(e) => setGmailUser(e.target.value)}
                      type="email"
                      placeholder="apnar.nam@gmail.com"
                      className="field"
                    />
                  </label>
                  <label className="mt-3 block">
                    <span className="label">App Password (১৬ অক্ষর)</span>
                    <input
                      value={gmailPass}
                      onChange={(e) => setGmailPass(e.target.value)}
                      placeholder="abcd efgh ijkl mnop"
                      className="field tracking-wide"
                    />
                    <span className="mt-1.5 block text-[11px] text-[var(--ink-soft)]">
                      ⚠️ এটি আপনার জিমেইলের সাধারণ পাসওয়ার্ড নয়।
                    </span>
                  </label>
                </>
              )}

              {(provider === "resend" || provider === "brevo") && (
                <>
                  <label className="mt-3 block">
                    <span className="label">API Key</span>
                    <input
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={provider === "resend" ? "re_xxxxxxxx" : "xkeysib-xxxxxxxx"}
                      className="field"
                    />
                  </label>
                  <label className="mt-3 block">
                    <span className="label">প্রেরকের ইমেইল</span>
                    <input
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      type="email"
                      placeholder={
                        provider === "resend" ? "onboarding@resend.dev" : "apnar@gmail.com"
                      }
                      className="field"
                    />
                  </label>
                </>
              )}

              {provider === "smtp" && (
                <>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <label className="col-span-2 block">
                      <span className="label">হোস্ট</span>
                      <input
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="mail.example.com"
                        className="field"
                      />
                    </label>
                    <label className="block">
                      <span className="label">পোর্ট</span>
                      <input
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        inputMode="numeric"
                        className="field"
                      />
                    </label>
                  </div>
                  <label className="mt-3 block">
                    <span className="label">ইউজারনেম</span>
                    <input
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      className="field"
                    />
                  </label>
                  <label className="mt-3 block">
                    <span className="label">পাসওয়ার্ড</span>
                    <input
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      type="password"
                      className="field"
                    />
                  </label>
                  <label className="mt-3 block">
                    <span className="label">প্রেরকের ইমেইল</span>
                    <input
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      type="email"
                      className="field"
                    />
                  </label>
                </>
              )}

              <label className="mt-3 block">
                <span className="label">প্রেরকের নাম</span>
                <input
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="কথা অ্যাপ"
                  className="field"
                />
              </label>

              <button
                onClick={save}
                disabled={busy}
                className="btn btn-primary mt-4 w-full py-3"
              >
                {busy ? "যাচাই হচ্ছে…" : "যাচাই করে সংরক্ষণ করুন"}
              </button>
            </section>

            {/* টেস্ট */}
            <section className="card p-5">
              <h2 className="text-sm font-bold">টেস্ট ইমেইল</h2>
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                নিজের ইমেইলে পাঠিয়ে নিশ্চিত হয়ে নিন।
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  type="email"
                  placeholder="apnar.nam@gmail.com"
                  className="field flex-1"
                />
                <button
                  onClick={sendTest}
                  disabled={busy || !testEmail}
                  className="btn bg-emerald-600 px-5 text-white disabled:opacity-60"
                >
                  পাঠান
                </button>
              </div>
            </section>

            {status.logs.length > 0 && (
              <section className="card p-5">
                <h2 className="text-sm font-bold">সাম্প্রতিক লগ</h2>
                <ul className="mt-2 divide-y divide-[var(--line)] text-sm">
                  {status.logs.map((log) => (
                    <li key={log.id} className="flex items-start gap-2 py-2">
                      <span>{log.success ? "✅" : "❌"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{log.email}</p>
                        <p className="truncate text-[11px] text-[var(--ink-soft)]">
                          {log.detail}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <button
              onClick={async () => {
                await api("/api/admin/mail", { method: "PUT", body: { action: "logout" } });
                await load();
                setMsg("বের হয়েছেন");
              }}
              className="btn btn-ghost w-full py-3 text-sm"
            >
              লগ আউট
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function GuideStep({
  n,
  title,
  desc,
  link,
  linkText,
}: {
  n: string;
  title: string;
  desc: string;
  link?: string;
  linkText?: string;
}) {
  return (
    <li className="flex gap-3 px-5 py-3.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-500)] text-[11px] font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--ink-soft)]">{desc}</p>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="btn-soft mt-1.5 inline-block rounded-full px-3 py-1 text-[11px] font-semibold"
          >
            {linkText} →
          </a>
        )}
      </div>
    </li>
  );
}
