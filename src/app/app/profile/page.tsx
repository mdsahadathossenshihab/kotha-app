"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { api, bn } from "@/lib/client";
import { fileToSquare } from "@/lib/image";
import { localPhone, prettyPhone } from "@/lib/phone";
import type { PublicUser } from "@/lib/types";

const COLORS = ["#2b7fff", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [about, setAbout] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [avatar, setAvatar] = useState("");
  const [toast, setToast] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api<{ user: PublicUser }>("/api/me");
        apply(res.user);
      } catch {
        router.replace("/login");
      }
    })();
  }, [router]);

  function apply(u: PublicUser) {
    setUser(u);
    setName(u.name);
    setPhone(localPhone(u.phone));
    setAbout(u.about);
    setColor(u.color || COLORS[0]);
    setAvatar(u.avatar);
  }

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const img = await fileToSquare(file);
    setAvatar(img);
    await save({ avatar: img });
  }

  async function save(extra?: Record<string, unknown>) {
    setSaving(true);
    setErr("");
    setToast("");
    try {
      const res = await api<{ user: PublicUser }>("/api/me", {
        method: "PATCH",
        body: { name, about, color, avatar, phone, ...extra },
      });
      apply(res.user);
      setToast("প্রোফাইল সংরক্ষণ হয়েছে ✅");
      setEditing(false);
      setTimeout(() => setToast(""), 2500);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "সংরক্ষণ করা যায়নি");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col bg-[var(--canvas)]">
      {/* হেডার */}
      <header className="brand-grad mesh relative px-5 pb-14 pt-7 text-white">
        <div className="relative flex items-center justify-between">
          <h1 className="text-xl font-bold">প্রোফাইল</h1>
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded-full bg-white/16 px-4 py-1.5 text-sm font-medium backdrop-blur active:scale-95"
          >
            {editing ? "বাতিল" : "✎ এডিট"}
          </button>
        </div>
      </header>

      <div className="thin-scroll -mt-10 flex-1 overflow-y-auto px-4 pb-6">
        {/* প্রোফাইল কার্ড */}
        <div className="card slide-up flex flex-col items-center p-6">
          <label className="relative cursor-pointer">
            <Avatar name={name || "?"} avatar={avatar} color={color} size={100} />
            <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-[var(--brand-500)] text-sm text-white shadow-lg">
              📷
            </span>
            <input type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
          </label>

          <h2 className="mt-3 text-xl font-bold">{name || "নাম নেই"}</h2>
          <p className="mt-0.5 text-sm text-[var(--ink-soft)]">{about || "—"}</p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
              ✅ ইমেইল ভেরিফাইড
            </span>
            {user?.phone && (
              <span className="rounded-full bg-[var(--brand-50)] px-3 py-1 text-[11px] font-medium text-[var(--brand-600)]">
                📱 নম্বর যুক্ত
              </span>
            )}
          </div>

          {avatar && (
            <button
              onClick={() => {
                setAvatar("");
                void save({ avatar: "" });
              }}
              className="mt-3 text-xs text-rose-500 underline"
            >
              প্রোফাইল ছবি সরান
            </button>
          )}
        </div>

        {toast && (
          <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-center text-sm text-emerald-700">
            {toast}
          </p>
        )}
        {err && (
          <p className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-center text-sm text-rose-600">
            {err}
          </p>
        )}

        {/* তথ্য / এডিট */}
        <div className="card mt-4 p-5">
          <h3 className="mb-4 text-sm font-bold text-[var(--ink)]">ব্যক্তিগত তথ্য</h3>

          {editing ? (
            <>
              <label className="block">
                <span className="label">নাম</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="field" />
              </label>

              <label className="mt-4 block">
                <span className="label">মোবাইল নম্বর</span>
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
              </label>

              <label className="mt-4 block">
                <span className="label">আমার সম্পর্কে</span>
                <input
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="যেমনঃ ব্যস্ত আছি"
                  className="field"
                />
              </label>

              <div className="mt-4">
                <span className="label">প্রোফাইলের রঙ</span>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`h-9 w-9 rounded-full transition ${
                        color === c ? "ring-2 ring-[var(--ink)] ring-offset-2" : ""
                      }`}
                      style={{ background: c }}
                      aria-label="রঙ"
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={() => save()}
                disabled={saving}
                className="btn btn-primary mt-5 w-full py-3"
              >
                {saving ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}
              </button>
            </>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              <InfoRow icon="✉️" label="ইমেইল" value={user?.email ?? "—"} />
              <InfoRow
                icon="📱"
                label="মোবাইল নম্বর"
                value={user?.phone ? bn(prettyPhone(user.phone)) : "যোগ করা হয়নি"}
                muted={!user?.phone}
                action={!user?.phone ? () => setEditing(true) : undefined}
              />
              <InfoRow icon="💬" label="আমার সম্পর্কে" value={about || "—"} />
            </div>
          )}
        </div>

        {/* অন্যান্য */}
        <div className="card mt-4 divide-y divide-[var(--line)] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5">
            <span className="text-lg">🔒</span>
            <span className="flex-1 text-sm font-medium">গোপনীয়তা ও নিরাপত্তা</span>
            <span className="text-xs text-emerald-600">সুরক্ষিত</span>
          </div>
          <div className="flex items-center gap-3 px-5 py-3.5">
            <span className="text-lg">ℹ️</span>
            <span className="flex-1 text-sm font-medium">অ্যাপ সংস্করণ</span>
            <span className="text-xs text-slate-400">{bn("2.0.0")}</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn mt-4 w-full border-[1.5px] border-rose-100 bg-rose-50 py-3 text-rose-600"
        >
          লগ আউট
        </button>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  muted,
  action,
}: {
  icon: string;
  label: string;
  value: string;
  muted?: boolean;
  action?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="text-lg">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-[var(--ink-soft)]">{label}</p>
        <p className={`truncate text-sm ${muted ? "text-slate-400" : "font-medium"}`}>{value}</p>
      </div>
      {action && (
        <button
          onClick={action}
          className="btn-soft rounded-full px-3 py-1 text-xs font-semibold"
        >
          + যোগ
        </button>
      )}
    </div>
  );
}
