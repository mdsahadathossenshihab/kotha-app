"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import { api, bn } from "@/lib/client";
import { fileToSquare } from "@/lib/image";

type Step = "email" | "code" | "profile";

type SendResponse = {
  email: string;
  maskedEmail: string;
  mailProvider: string;
  inboxUrl: string;
  isNewUser: boolean;
  name: string | null;
  delivered: boolean;
  instantCode: string | null;
};

const STEPS = [
  { key: "email", label: "ইমেইল" },
  { key: "code", label: "যাচাই" },
  { key: "profile", label: "প্রোফাইল" },
];

export default function AuthForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [masked, setMasked] = useState("");
  const [inbox, setInbox] = useState("");
  const [mailName, setMailName] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [instant, setInstant] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [mailReady, setMailReady] = useState<boolean | null>(null);
  const codeRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api<{ configured: boolean }>("/api/admin/mail");
        setMailReady(res.configured);
      } catch {
        setMailReady(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code" && !instant) codeRef.current?.focus();
  }, [step, instant]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api<SendResponse>("/api/auth/otp/send", {
        method: "POST",
        body: { email },
      });
      setMasked(res.maskedEmail);
      setInbox(res.inboxUrl);
      setMailName(res.mailProvider);
      setIsNew(res.isNewUser);
      setDelivered(res.delivered);
      setInstant(Boolean(res.instantCode));
      setCode(res.instantCode ?? "");
      setStep("code");
      setCooldown(40);
    } catch (err) {
      setError(err instanceof Error ? err.message : "কোড পাঠানো যায়নি");
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    if (isNew) {
      setStep("profile");
      return;
    }
    await finish();
  }

  async function finish(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/auth/otp/verify", {
        method: "POST",
        body: { email, code, name: name.trim(), phone: phone.trim(), avatar },
      });
      router.replace("/app");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "যাচাই করা যায়নি";
      if (msg.includes("নাম")) {
        setStep("profile");
        setError("");
      } else {
        setError(msg);
        if (msg.includes("মেয়াদ") || msg.includes("কোড পাওয়া")) setStep("code");
      }
    } finally {
      setLoading(false);
    }
  }

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatar(await fileToSquare(file));
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <main className="min-h-[100dvh] bg-[var(--canvas)]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col">
        {/* হেডার */}
        <header className="brand-grad mesh relative px-6 pb-20 pt-10 text-white">
          <div className="relative flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/app-icon.png" alt="কথা" className="h-10 w-10 rounded-xl shadow-lg" />
            <span className="text-lg font-bold">কথা</span>
          </div>

          <h1 className="relative mt-7 text-[26px] font-bold leading-tight">
            {step === "email" && "স্বাগতম 👋"}
            {step === "code" && "যাচাই করুন"}
            {step === "profile" && "প্রোফাইল সাজান"}
          </h1>
          <p className="relative mt-1.5 text-sm text-white/85">
            {step === "email" && "জিমেইল দিয়ে সেকেন্ডেই শুরু করুন"}
            {step === "code" && masked}
            {step === "profile" && "বন্ধুরা আপনাকে এভাবেই দেখবে"}
          </p>

          {/* ধাপ নির্দেশক */}
          <div className="relative mt-6 flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex flex-1 flex-col gap-1.5">
                <span
                  className={`h-1 rounded-full transition-all ${
                    i <= stepIndex ? "bg-white" : "bg-white/25"
                  }`}
                />
                <span
                  className={`text-[11px] ${i <= stepIndex ? "text-white" : "text-white/55"}`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </header>

        {/* ফর্ম কার্ড */}
        <div className="-mt-12 flex-1 px-4 pb-8">
          <div className="card slide-up p-6">
            {step === "email" && (
              <form onSubmit={sendCode}>
                <label className="block">
                  <span className="label">জিমেইল ঠিকানা</span>
                  <div className="flex items-center gap-2 rounded-[14px] border-[1.5px] border-[var(--line)] bg-[#f8fafd] px-3 focus-within:border-[var(--brand-400)] focus-within:bg-white">
                    <span className="border-r border-[var(--line)] py-3 pr-3 text-lg">✉️</span>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="apnar.nam@gmail.com"
                      className="w-full bg-transparent py-3 outline-none"
                      required
                    />
                  </div>
                </label>

                {error && <Alert text={error} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary mt-5 w-full py-3.5 text-[17px]"
                >
                  {loading ? "অপেক্ষা করুন…" : "পরবর্তী ধাপ"}
                </button>

                <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-5 text-center">
                  <Perk icon="🔒" text="নিরাপদ" />
                  <Perk icon="🚫" text="পাসওয়ার্ড নেই" />
                  <Perk icon="⚡" text="৩০ সেকেন্ড" />
                </div>

                {mailReady === false && (
                  <Link
                    href="/setup"
                    className="mt-5 flex items-center gap-2.5 rounded-xl border border-dashed border-[var(--brand-400)] bg-[var(--brand-50)] px-3.5 py-2.5"
                  >
                    <span className="text-base">📬</span>
                    <span className="flex-1 text-left text-[11px] leading-snug text-[var(--ink-soft)]">
                      <b className="text-[var(--brand-600)]">অ্যাপের মালিক?</b> কোড সরাসরি
                      ইনবক্সে পাঠাতে জিমেইল যুক্ত করুন
                    </span>
                    <span className="text-[var(--brand-500)]">›</span>
                  </Link>
                )}
              </form>
            )}

            {step === "code" && (
              <form onSubmit={submitCode}>
                {delivered && (
                  <div className="mb-4 rounded-2xl bg-emerald-50 p-3.5 text-sm text-emerald-800">
                    <p>
                      ✅ কোডটি <b>{masked}</b> ঠিকানায় পাঠানো হয়েছে।
                    </p>
                    <p className="mt-1 text-xs text-emerald-700/80">
                      না পেলে Spam / Promotions ফোল্ডার দেখুন।
                    </p>
                    {inbox && (
                      <a
                        href={inbox}
                        target="_blank"
                        rel="noreferrer"
                        className="btn mt-2.5 bg-emerald-600 px-3.5 py-1.5 text-xs text-white"
                      >
                        {mailName} খুলুন →
                      </a>
                    )}
                  </div>
                )}

                {instant && (
                  <div className="mb-5 rounded-2xl border-[1.5px] border-dashed border-[var(--brand-400)] bg-[var(--brand-50)] p-4 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-600)]">
                      আপনার ভেরিফিকেশন কোড
                    </p>
                    <p className="mt-1.5 text-[32px] font-bold leading-none tracking-[0.25em] text-[var(--brand-700)]">
                      {bn(code)}
                    </p>
                    <p className="mt-2.5 text-xs text-[var(--ink-soft)]">
                      কোডটি নিচে বসে গেছে ✅ শুধু নিচের বাটনে চাপ দিন
                    </p>
                    <Link
                      href="/setup"
                      className="mt-2 inline-block text-[11px] text-[var(--brand-600)] underline"
                    >
                      ইনবক্সে কোড পেতে চান? জিমেইল যুক্ত করুন →
                    </Link>
                  </div>
                )}

                <label className="block">
                  <span className="label">৬ সংখ্যার কোড</span>
                  <input
                    ref={codeRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="------"
                    className="field py-4 text-center text-[26px] font-semibold tracking-[0.45em]"
                    required
                  />
                </label>

                {error && <Alert text={error} />}

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="btn btn-primary mt-5 w-full py-3.5 text-[17px]"
                >
                  {loading ? "যাচাই হচ্ছে…" : isNew ? "পরবর্তী ধাপ" : "লগইন করুন"}
                </button>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setError("");
                    }}
                    className="text-[var(--ink-soft)]"
                  >
                    ← ইমেইল বদলান
                  </button>
                  <button
                    type="button"
                    disabled={cooldown > 0 || loading}
                    onClick={() => sendCode()}
                    className="font-semibold text-[var(--brand-600)] disabled:text-slate-400"
                  >
                    {cooldown > 0 ? `নতুন কোড (${bn(cooldown)})` : "নতুন কোড নিন"}
                  </button>
                </div>
              </form>
            )}

            {step === "profile" && (
              <form onSubmit={finish}>
                {/* ছবি */}
                <div className="flex flex-col items-center">
                  <label className="relative cursor-pointer">
                    <Avatar name={name || "?"} avatar={avatar} size={92} />
                    <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[var(--brand-500)] text-sm text-white shadow">
                      📷
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={pickPhoto}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-2 text-xs text-[var(--ink-soft)]">
                    {avatar ? "ছবি যোগ হয়েছে ✅" : "প্রোফাইল ছবি দিন (ঐচ্ছিক)"}
                  </p>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar("")}
                      className="mt-1 text-xs text-rose-500 underline"
                    >
                      ছবি সরান
                    </button>
                  )}
                </div>

                <label className="mt-5 block">
                  <span className="label">আপনার নাম *</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    placeholder="যেমনঃ রাহুল আহমেদ"
                    className="field"
                    required
                  />
                </label>

                <label className="mt-4 block">
                  <span className="label">মোবাইল নম্বর (ঐচ্ছিক)</span>
                  <div className="flex items-center gap-2 rounded-[14px] border-[1.5px] border-[var(--line)] bg-[#f8fafd] px-3 focus-within:border-[var(--brand-400)] focus-within:bg-white">
                    <span className="border-r border-[var(--line)] py-3 pr-3 text-sm font-medium text-[var(--ink-soft)]">
                      🇧🇩 +৮৮০
                    </span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="tel"
                      placeholder="01712345678"
                      className="w-full bg-transparent py-3 outline-none"
                    />
                  </div>
                  <span className="mt-1.5 block text-xs text-[var(--ink-soft)]">
                    বন্ধুরা নম্বর দিয়েও আপনাকে খুঁজে পাবে।
                  </span>
                </label>

                {error && <Alert text={error} />}

                <button
                  type="submit"
                  disabled={loading || name.trim().length < 2}
                  className="btn btn-primary mt-5 w-full py-3.5 text-[17px]"
                >
                  {loading ? "তৈরি হচ্ছে…" : "শুরু করুন 🎉"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep("code")}
                  className="mt-3 w-full text-sm text-[var(--ink-soft)]"
                >
                  ← আগের ধাপে
                </button>
              </form>
            )}
          </div>

          <p className="mt-5 px-4 text-center text-xs leading-relaxed text-[var(--ink-soft)]">
            চালিয়ে গেলে আপনি আমাদের শর্তাবলি ও গোপনীয়তা নীতিতে সম্মত হচ্ছেন।
          </p>
        </div>
      </div>
    </main>
  );
}

function Alert({ text }: { text: string }) {
  return (
    <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">{text}</p>
  );
}

function Perk({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-lg">{icon}</span>
      <span className="text-[11px] text-[var(--ink-soft)]">{text}</span>
    </div>
  );
}
