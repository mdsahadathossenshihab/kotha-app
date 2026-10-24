"use client";

import { useState } from "react";
import { api } from "@/lib/client";

type Result = {
  owner: string;
  repo: string;
  fileCount: number;
  repoUrl: string;
  vercelUrl: string;
  message: string;
};

const TOKEN_URL =
  "https://github.com/settings/tokens/new?description=Kotha%20App%20Upload&scopes=repo";

export default function DeployPanel() {
  const [token, setToken] = useState("");
  const [repo, setRepo] = useState("kotha-app");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState("");

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setResult(null);
    setBusy(true);
    try {
      const res = await api<Result>("/api/admin/deploy", {
        method: "POST",
        body: { token: token.trim(), repo },
      });
      setResult(res);
      setToken("");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "আপলোড করা যায়নি");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      /* উপেক্ষা */
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[var(--canvas)]">
      <header className="brand-grad mesh relative px-5 pb-14 pt-8 text-white">
        <div className="relative mx-auto max-w-lg">
          <h1 className="text-[26px] font-bold leading-tight">📲 ফোন থেকে আপলোড</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/90">
            একটি বাটন চাপলেই পুরো প্রজেক্ট আপনার GitHub-এ চলে যাবে।
            <b> কোনো ফাইল হাতে আপলোড করতে হবে না।</b>
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-9 max-w-lg space-y-4 px-4 pb-16">
        {/* সফল হলে */}
        {result ? (
          <>
            <div className="card slide-up bg-emerald-50 p-5 text-center">
              <p className="text-3xl">🎉</p>
              <p className="mt-2 font-bold text-emerald-800">{result.message}</p>
              <a
                href={result.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-xs text-emerald-700 underline"
              >
                {result.repoUrl}
              </a>
            </div>

            <div className="card overflow-hidden">
              <div className="border-b border-[var(--line)] bg-[var(--brand-50)] px-5 py-3">
                <h2 className="text-sm font-bold text-[var(--brand-700)]">
                  এখন ভার্সেলে নিন (৩ ধাপ)
                </h2>
              </div>
              <ol className="divide-y divide-[var(--line)]">
                <Step n="১" title="ডাটাবেস বানান">
                  <a
                    href="https://neon.tech"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-soft mt-1.5 inline-block rounded-full px-3 py-1 text-[11px] font-semibold"
                  >
                    neon.tech খুলুন →
                  </a>
                  <p className="mt-1.5 text-[11px] text-[var(--ink-soft)]">
                    Sign up → Create Project → Region <b>Singapore</b> → Connection String কপি
                    করুন।
                  </p>
                </Step>

                <Step n="২" title="ভার্সেলে ইমপোর্ট করুন">
                  <a
                    href={result.vercelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary mt-1.5 px-4 py-2 text-[12px]"
                  >
                    ভার্সেলে ডিপ্লয় করুন →
                  </a>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--ink-soft)]">
                    Environment Variables-এ দুটি জিনিস দিনঃ
                  </p>
                  <div className="mt-1.5 space-y-1.5">
                    <CopyRow
                      label="DATABASE_URL"
                      value="DATABASE_URL"
                      hint="Neon-এর লাইনটি বসান"
                      onCopy={copy}
                      copied={copied}
                    />
                    <CopyRow
                      label="SESSION_SECRET"
                      value={`kotha-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`}
                      hint="এটি কপি করে বসিয়ে দিন"
                      onCopy={copy}
                      copied={copied}
                    />
                  </div>
                </Step>

                <Step n="৩" title="টেবিল তৈরি করুন">
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink-soft)]">
                    Neon-এর <b>SQL Editor</b> খুলুন → নিচের বাটনে চেপে SQL কপি করুন → পেস্ট করে{" "}
                    <b>Run</b> চাপুন।
                  </p>
                  <a
                    href="/api/admin/deploy/sql"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-soft mt-1.5 inline-block rounded-full px-3 py-1 text-[11px] font-semibold"
                  >
                    SQL কোড খুলুন →
                  </a>
                </Step>
              </ol>
            </div>

            <button onClick={() => setResult(null)} className="btn btn-ghost w-full py-3 text-sm">
              আবার আপলোড করুন
            </button>
          </>
        ) : (
          <>
            {/* টোকেন গাইড */}
            <div className="card slide-up overflow-hidden">
              <div className="border-b border-[var(--line)] bg-[var(--brand-50)] px-5 py-3">
                <h2 className="text-sm font-bold text-[var(--brand-700)]">
                  🔑 আগে GitHub টোকেন নিন (১ মিনিট)
                </h2>
              </div>
              <ol className="divide-y divide-[var(--line)]">
                <Step n="১" title="GitHub-এ লগইন করুন">
                  <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
                    অ্যাকাউন্ট না থাকলে github.com-এ ফ্রি খুলে নিন।
                  </p>
                </Step>
                <Step n="২" title="টোকেন তৈরি করুন">
                  <a
                    href={TOKEN_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary mt-1.5 px-4 py-2 text-[12px]"
                  >
                    টোকেন পাতা খুলুন →
                  </a>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--ink-soft)]">
                    পাতার একদম নিচে <b>Generate token</b> চাপুন। (<b>repo</b> টিক আগে থেকেই
                    দেওয়া থাকবে)
                  </p>
                </Step>
                <Step n="৩" title="টোকেন কপি করুন">
                  <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
                    <code className="rounded bg-slate-100 px-1">ghp_</code> দিয়ে শুরু হওয়া লেখাটি
                    কপি করে নিচে বসান।
                  </p>
                </Step>
              </ol>
            </div>

            {/* ফর্ম */}
            <form onSubmit={upload} className="card p-5">
              <label className="block">
                <span className="label">GitHub টোকেন</span>
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  type="password"
                  autoComplete="off"
                  placeholder="ghp_xxxxxxxxxxxxxxxx"
                  className="field"
                  required
                />
              </label>

              <label className="mt-4 block">
                <span className="label">রিপোজিটরির নাম</span>
                <input
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="kotha-app"
                  className="field"
                  required
                />
              </label>

              {err && (
                <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                  {err}
                </p>
              )}

              <button disabled={busy} className="btn btn-primary mt-5 w-full py-3.5 text-[16px]">
                {busy ? "আপলোড হচ্ছে… একটু অপেক্ষা করুন" : "🚀 GitHub-এ আপলোড করুন"}
              </button>

              <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--ink-soft)]">
                আপলোডে ৩০-৬০ সেকেন্ড লাগতে পারে। পাতা বন্ধ করবেন না।
                <br />
                টোকেনটি কোথাও সংরক্ষণ করা হয় না।
              </p>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 px-5 py-3.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-500)] text-[11px] font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">{title}</p>
        {children}
      </div>
    </li>
  );
}

function CopyRow({
  label,
  value,
  hint,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  hint: string;
  onCopy: (text: string, label: string) => void;
  copied: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold">{label}</p>
        <p className="truncate text-[10px] text-[var(--ink-soft)]">{hint}</p>
      </div>
      <button
        onClick={() => onCopy(value, label)}
        className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[var(--brand-600)]"
      >
        {copied === label ? "কপি ✓" : "কপি"}
      </button>
    </div>
  );
}
