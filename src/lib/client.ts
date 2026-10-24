"use client";

export async function api<T>(
  url: string,
  options?: { method?: string; body?: unknown; signal?: AbortSignal },
): Promise<T> {
  const res = await fetch(url, {
    method: options?.method ?? "GET",
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    signal: options?.signal,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data?.error || "কিছু একটা সমস্যা হয়েছে");
  return data as T;
}

const BN = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function bn(input: string | number) {
  return String(input).replace(/\d/g, (d) => BN[Number(d)]);
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const period = h < 12 ? "সকাল" : h < 16 ? "দুপুর" : h < 19 ? "বিকাল" : "রাত";
  h = h % 12 || 12;
  return `${period} ${bn(h)}:${bn(m)}`;
}

export function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(Date.now() - 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "আজ";
  if (same(d, yest)) return "গতকাল";
  const days = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
  return `${days[d.getDay()]}, ${bn(d.getDate())}/${bn(d.getMonth() + 1)}`;
}

export function listTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return formatTime(iso);
  return formatDay(iso);
}

export function duration(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${bn(m)}:${bn(s)}`;
}

export function onlineStatus(lastSeen: string) {
  const diff = Date.now() - new Date(lastSeen).getTime();
  if (diff < 70_000) return { online: true, text: "অনলাইনে আছে" };
  if (diff < 3_600_000) return { online: false, text: `${bn(Math.round(diff / 60000))} মিনিট আগে` };
  if (diff < 86_400_000)
    return { online: false, text: `${bn(Math.round(diff / 3_600_000))} ঘণ্টা আগে` };
  return { online: false, text: `${bn(Math.round(diff / 86_400_000))} দিন আগে` };
}
