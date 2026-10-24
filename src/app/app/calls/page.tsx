"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { useCall } from "@/components/CallProvider";
import { api, duration, listTime } from "@/lib/client";
import type { CallLog } from "@/lib/types";

export default function CallsPage() {
  const { startCall } = useCall();
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const res = await api<{ calls: CallLog[] }>("/api/calls/history");
        if (!stop) setLogs(res.calls);
      } catch {
        /* উপেক্ষা */
      } finally {
        if (!stop) setLoading(false);
      }
    };
    void load();
    const id = setInterval(load, 6000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <header className="brand-grad mesh relative px-5 pb-6 pt-7 text-white">
        <h1 className="relative text-[26px] font-bold leading-none">কল</h1>
        <p className="relative mt-1 text-xs text-white/75">ইন্টারনেট দিয়ে ফ্রি অডিও কল</p>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="p-6 text-center text-slate-400">লোড হচ্ছে…</p>}

        {!loading && logs.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-[var(--brand-50)] text-5xl">
              📞
            </div>
            <h2 className="mt-2 text-lg font-bold">কোনো কল হয়নি</h2>
            <p className="text-sm text-[var(--ink-soft)]">
              কন্টাক্ট থেকে যেকোনো বন্ধুকে ফ্রি অডিও কল করুন।
            </p>
            <Link href="/app/contacts" className="btn btn-primary mt-2 px-6 py-3">
              কল করুন
            </Link>
          </div>
        )}

        <ul className="divide-y divide-[var(--line)]">
          {logs.map((log) => {
            const missed = !log.answeredAt;
            const outgoing = log.role === "caller";
            return (
              <li key={log.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar
                  name={log.peer?.name ?? "?"}
                  avatar={log.peer?.avatar}
                  color={log.peer?.color}
                  size={46}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate font-medium ${
                      missed && !outgoing ? "text-red-500" : "text-slate-800"
                    }`}
                  >
                    {log.peer?.name ?? "অজানা"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {outgoing ? "↗ আউটগোয়িং" : "↙ ইনকামিং"} •{" "}
                    {missed
                      ? log.status === "rejected"
                        ? "গ্রহণ করা হয়নি"
                        : "মিসড কল"
                      : log.durationSec > 0
                        ? duration(log.durationSec)
                        : "সংযুক্ত হয়নি"}{" "}
                    • {listTime(log.startedAt)}
                  </p>
                </div>
                <button
                  onClick={() => log.peer && startCall(log.peer)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-lg active:scale-95"
                  aria-label="আবার কল"
                >
                  📞
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
