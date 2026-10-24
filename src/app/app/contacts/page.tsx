"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { useCall } from "@/components/CallProvider";
import { api, bn, onlineStatus } from "@/lib/client";
import type { PublicUser } from "@/lib/types";

type Lookup = {
  valid: boolean;
  found?: boolean;
  self?: boolean;
  email?: string;
  phone?: string;
  prettyPhone?: string;
  byPhone?: boolean;
  alreadyInvited?: boolean;
  user?: PublicUser;
  error?: string;
};

type InviteRow = {
  id: number;
  email: string;
  channel: string;
  joined: boolean;
};

export default function ContactsPage() {
  const router = useRouter();
  const { startCall } = useCall();

  const [contacts, setContacts] = useState<PublicUser[]>([]);
  const [invitesList, setInvitesList] = useState<InviteRow[]>([]);
  const [search, setSearch] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [nameResults, setNameResults] = useState<PublicUser[]>([]);
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState("");
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    setInviteLink(window.location.origin);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [c, i] = await Promise.all([
        api<{ contacts: PublicUser[] }>("/api/contacts"),
        api<{ invites: InviteRow[] }>("/api/invites"),
      ]);
      setContacts(c.contacts);
      setInvitesList(i.invites);
    } catch {
      /* উপেক্ষা */
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const value = search.trim();
    if (!value) {
      setLookup(null);
      setNameResults([]);
      return;
    }
    setChecking(true);
    const id = setTimeout(async () => {
      try {
        const digits = value.replace(/[^\d\u09E6-\u09EF+]/g, "");
        if (value.includes("@") || digits.length >= 6) {
          const res = await api<Lookup>(`/api/users/lookup?q=${encodeURIComponent(value)}`);
          setLookup(res);
        } else {
          setLookup(null);
        }
        const users = await api<{ users: PublicUser[] }>(
          `/api/users?q=${encodeURIComponent(value)}`,
        );
        setNameResults(users.users);
      } catch {
        /* উপেক্ষা */
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  const openChat = useCallback(
    async (user: PublicUser) => {
      try {
        const res = await api<{ chatId: number }>("/api/chats", {
          method: "POST",
          body: { userId: user.id },
        });
        router.push(`/app/chat/${res.chatId}`);
      } catch {
        /* উপেক্ষা */
      }
    },
    [router],
  );

  const inviteText = `আসসালামু আলাইকুম! আমি "কথা" অ্যাপ ব্যবহার করছি — এখানে বিনামূল্যে মেসেজ আর অডিও কল করা যায়। তুমিও এখান থেকে ইনস্টল করে নাও: ${inviteLink}`;

  function flash(text: string) {
    setToast(text);
    setTimeout(() => setToast(""), 3500);
  }

  async function inviteByEmail(email: string) {
    setSending(true);
    try {
      const res = await api<{ message: string }>("/api/invites", {
        method: "POST",
        body: { email, channel: "email", link: inviteLink },
      });
      flash(res.message);
      await loadAll();
    } catch (err) {
      flash(err instanceof Error ? err.message : "আমন্ত্রণ পাঠানো যায়নি");
    } finally {
      setSending(false);
    }
  }

  async function shareInvite(email?: string) {
    if (email) {
      await api("/api/invites", {
        method: "POST",
        body: { email, channel: "share", link: inviteLink },
      }).catch(() => {});
      await loadAll();
    }
    if (navigator.share) {
      await navigator.share({ title: "কথা অ্যাপ", text: inviteText }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(inviteText).catch(() => {});
      flash("আমন্ত্রণ বার্তা কপি হয়েছে ✅");
    }
  }

  async function addContact(user: PublicUser) {
    try {
      await api("/api/contacts", { method: "POST", body: { userId: user.id } });
      flash(`${user.name} কন্টাক্টে যোগ হয়েছে ✅`);
      await loadAll();
    } catch {
      /* উপেক্ষা */
    }
  }

  const contactIds = new Set(contacts.map((c) => c.id));
  const otherResults = nameResults.filter(
    (u) => !contactIds.has(u.id) && u.id !== lookup?.user?.id,
  );
  const pendingInvites = invitesList.filter((i) => !i.joined);

  return (
    <div className="flex h-full flex-col">
      <header className="brand-grad mesh relative px-5 pb-6 pt-7 text-white">
        <h1 className="relative text-[26px] font-bold leading-none">নতুন চ্যাট</h1>
        <p className="relative mt-1 text-xs text-white/75">
          জিমেইল বা মোবাইল নম্বর দিয়ে বন্ধু খুঁজুন
        </p>
        <div className="relative mt-5 flex items-center gap-2 rounded-2xl bg-white/16 px-4 py-2.5 backdrop-blur">
          <span className="text-white/70">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="জিমেইল, মোবাইল নম্বর বা নাম"
            className="w-full bg-transparent text-[15px] text-white placeholder-white/60 outline-none"
          />
        </div>
      </header>

      {toast && (
        <p className="bg-green-50 px-4 py-2 text-center text-sm text-green-700">{toast}</p>
      )}

      <div className="flex-1 overflow-y-auto pb-4">
        {checking && search.trim() && (
          <p className="px-4 py-3 text-sm text-slate-400">খোঁজা হচ্ছে…</p>
        )}

        {lookup?.valid && lookup.self && (
          <p className="m-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            এটি তো আপনার নিজের ইমেইল 🙂
          </p>
        )}

        {lookup?.valid && lookup.found && lookup.user && (
          <section className="card slide-up m-4 border-[var(--brand-100)] bg-[var(--brand-50)]/60 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
              ✅ কথা অ্যাপে পাওয়া গেছে
            </p>
            <div className="flex items-center gap-3">
              <Avatar
                name={lookup.user.name}
                avatar={lookup.user.avatar}
                color={lookup.user.color}
                size={52}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-800">{lookup.user.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {lookup.user.email} • {onlineStatus(lookup.user.lastSeen).text}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                onClick={() => lookup.user && openChat(lookup.user)}
                className="btn btn-primary py-2.5 text-sm"
              >
                💬 মেসেজ
              </button>
              <button
                onClick={() => lookup.user && startCall(lookup.user)}
                className="btn bg-emerald-500 py-2.5 text-sm text-white"
              >
                📞 কল
              </button>
              <button
                onClick={() => lookup.user && addContact(lookup.user)}
                className="btn btn-ghost py-2.5 text-sm"
              >
                ➕ সেভ
              </button>
            </div>
          </section>
        )}

        {lookup?.valid && lookup.found === false && !lookup.self && (
          <section className="card slide-up m-4 border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              এখনো অ্যাকাউন্ট নেই
            </p>
            <p className="mt-2 text-sm text-slate-700">
              <b>{lookup.byPhone ? lookup.prettyPhone : lookup.email}</b> কথা অ্যাপে নেই।
              {lookup.byPhone
                ? " তার জিমেইল দিয়ে খুঁজুন অথবা নিচের লিংক শেয়ার করে আমন্ত্রণ জানান।"
                : " আমন্ত্রণ পাঠান — অ্যাকাউন্ট খুললেই আপনাদের কন্টাক্ট যুক্ত হয়ে যাবে।"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {!lookup.byPhone && (
                <button
                  onClick={() => inviteByEmail(lookup.email!)}
                  disabled={sending}
                  className="btn btn-primary py-2.5 text-sm"
                >
                  {sending ? "পাঠানো হচ্ছে…" : "✉️ আমন্ত্রণ"}
                </button>
              )}
              <button
                onClick={() => shareInvite(lookup.email)}
                className={`btn btn-ghost py-2.5 text-sm ${lookup.byPhone ? "col-span-2" : ""}`}
              >
                📤 লিংক শেয়ার
              </button>
            </div>
            {lookup.alreadyInvited && (
              <p className="mt-2 text-xs text-amber-700">
                এই ইমেইলে আগে আমন্ত্রণ পাঠানো হয়েছে।
              </p>
            )}
          </section>
        )}

        {lookup && !lookup.valid && search.includes("@") && (
          <p className="m-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {lookup.error ?? "সঠিক ইমেইল ঠিকানা লিখুন"}
          </p>
        )}

        <Section title={`আমার কন্টাক্ট (${bn(contacts.length)})`}>
          {contacts.length === 0 && (
            <p className="px-4 py-4 text-sm text-slate-400">
              এখনো কোনো কন্টাক্ট নেই। উপরে বন্ধুর জিমেইল লিখে খুঁজুন।
            </p>
          )}
          {contacts
            .filter(
              (c) =>
                !search.trim() ||
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.email.toLowerCase().includes(search.toLowerCase()) ||
                (c.phone ?? "").includes(search.replace(/\D/g, "")),
            )
            .map((user) => (
              <Row key={user.id} user={user} onChat={openChat} onCall={startCall} />
            ))}
        </Section>

        {otherResults.length > 0 && (
          <Section title="অন্যান্য ব্যবহারকারী">
            {otherResults.map((user) => (
              <Row key={user.id} user={user} onChat={openChat} onCall={startCall} />
            ))}
          </Section>
        )}

        {pendingInvites.length > 0 && (
          <Section title={`পাঠানো আমন্ত্রণ (${bn(pendingInvites.length)})`}>
            {pendingInvites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xl">
                  ⏳
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-700">{inv.email}</p>
                  <p className="text-xs text-slate-400">অ্যাকাউন্ট খোলার অপেক্ষায়</p>
                </div>
                <button
                  onClick={() => inviteByEmail(inv.email)}
                  disabled={sending}
                  className="btn-soft rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                >
                  আবার পাঠান
                </button>
              </li>
            ))}
          </Section>
        )}

        <div className="card m-4 p-5 text-center">
          <p className="text-sm font-semibold text-slate-700">বন্ধুদের কথা অ্যাপে আনুন</p>
          <p className="mt-1 text-xs text-slate-500">
            যত বেশি বন্ধু, তত বেশি ফ্রি কল ও মেসেজ।
          </p>
          <button
            onClick={() => shareInvite()}
            className="btn btn-primary mt-3 px-5 py-2.5 text-sm"
          >
            📤 আমন্ত্রণ লিংক শেয়ার করুন
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="sticky top-0 z-10 bg-[var(--canvas)] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
        {title}
      </h2>
      <ul className="divide-y divide-[var(--line)] bg-white">{children}</ul>
    </section>
  );
}

function Row({
  user,
  onChat,
  onCall,
}: {
  user: PublicUser;
  onChat: (u: PublicUser) => void;
  onCall: (u: PublicUser) => void;
}) {
  const status = onlineStatus(user.lastSeen);
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Avatar
        name={user.name}
        avatar={user.avatar}
        color={user.color}
        size={46}
        online={status.online}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-800">{user.name}</p>
        <p className="truncate text-xs text-slate-500">{user.about || status.text}</p>
      </div>
      <button
        onClick={() => onChat(user)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-50)] text-lg active:scale-95"
        aria-label="বার্তা"
      >
        💬
      </button>
      <button
        onClick={() => onCall(user)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-lg active:scale-95"
        aria-label="অডিও কল"
      >
        📞
      </button>
    </li>
  );
}
