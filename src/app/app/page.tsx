"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import { api, bn, listTime, onlineStatus } from "@/lib/client";
import type { ChatSummary } from "@/lib/types";

export default function ChatListPage() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const res = await api<{ chats: ChatSummary[] }>("/api/chats");
        if (!stop) setChats(res.chats);
      } catch {
        /* উপেক্ষা */
      } finally {
        if (!stop) setLoading(false);
      }
    };
    void load();
    const id = setInterval(load, 4000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  const filtered = useMemo(
    () =>
      chats.filter(
        (c) =>
          !query.trim() ||
          c.partner.name.toLowerCase().includes(query.toLowerCase()) ||
          c.partner.email.toLowerCase().includes(query.toLowerCase()),
      ),
    [chats, query],
  );

  const totalUnread = chats.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="brand-grad mesh relative px-5 pb-6 pt-7 text-white">
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold leading-none">কথা</h1>
            <p className="mt-1 text-xs text-white/75">
              {totalUnread > 0
                ? `${bn(totalUnread)}টি নতুন বার্তা`
                : `${bn(chats.length)}টি কথোপকথন`}
            </p>
          </div>
          <Link
            href="/app/contacts"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/18 text-xl backdrop-blur active:scale-95"
            aria-label="নতুন চ্যাট"
          >
            ✎
          </Link>
        </div>

        <div className="relative mt-5 flex items-center gap-2 rounded-2xl bg-white/16 px-4 py-2.5 backdrop-blur">
          <span className="text-white/70">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="নাম বা ইমেইল খুঁজুন"
            className="w-full bg-transparent text-[15px] text-white placeholder-white/60 outline-none"
          />
        </div>
      </header>

      <div className="thin-scroll flex-1 overflow-y-auto">
        {loading && (
          <div className="space-y-1 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="skeleton h-[52px] w-[52px] rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3.5 w-1/3 rounded-full" />
                  <div className="skeleton h-3 w-2/3 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center px-8 py-16 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-[var(--brand-50)] text-5xl">
              💬
            </div>
            <h2 className="mt-5 text-lg font-bold">
              {query ? "কিছু পাওয়া যায়নি" : "কথা বলা শুরু করুন"}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">
              {query
                ? "অন্য নাম বা ইমেইল দিয়ে খুঁজে দেখুন।"
                : "বন্ধুর জিমেইল বা নম্বর দিয়ে খুঁজুন — না থাকলে আমন্ত্রণ পাঠান।"}
            </p>
            {!query && (
              <Link href="/app/contacts" className="btn btn-primary mt-5 px-6 py-3">
                🔍 বন্ধু খুঁজুন
              </Link>
            )}
          </div>
        )}

        <ul>
          {filtered.map((chat) => {
            const status = onlineStatus(chat.partner.lastSeen);
            const unread = chat.unread > 0;
            return (
              <li key={chat.id}>
                <Link
                  href={`/app/chat/${chat.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-slate-50"
                >
                  <Avatar
                    name={chat.partner.name}
                    avatar={chat.partner.avatar}
                    color={chat.partner.color}
                    size={54}
                    online={status.online}
                  />
                  <div className="min-w-0 flex-1 border-b border-[var(--line)] pb-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={`truncate text-[15px] ${
                          unread ? "font-bold" : "font-semibold"
                        }`}
                      >
                        {chat.partner.name}
                      </p>
                      <span
                        className={`shrink-0 text-[11px] ${
                          unread ? "font-semibold text-[var(--brand-600)]" : "text-slate-400"
                        }`}
                      >
                        {listTime(chat.lastMessageAt)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-[13px] ${
                          unread ? "font-medium text-[var(--ink)]" : "text-[var(--ink-soft)]"
                        }`}
                      >
                        {chat.lastMessage || "নতুন কথোপকথন"}
                      </p>
                      {unread && (
                        <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[var(--brand-500)] px-1.5 text-[11px] font-bold text-white">
                          {bn(chat.unread)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
