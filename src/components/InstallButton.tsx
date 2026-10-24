"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">("android");
  const [hint, setHint] = useState("");

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setHint("✅ ইনস্টল হয়ে গেছে! হোম স্ক্রিনে “কথা” আইকন দেখুন।");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const timer = window.setTimeout(() => {
      const ua = navigator.userAgent;
      if (/iphone|ipad|ipod/i.test(ua)) setPlatform("ios");
      else if (/android/i.test(ua)) setPlatform("android");
      else setPlatform("desktop");
      if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      setHint(
        choice.outcome === "accepted"
          ? "ইনস্টল শুরু হয়েছে…"
          : "ইনস্টল বাতিল হয়েছে। আবার চেষ্টা করুন।",
      );
      return;
    }

    setHint(
      platform === "ios"
        ? "Safari-র নিচের Share (⬆️) বাটনে চাপুন → “Add to Home Screen” বেছে নিন → Add।"
        : platform === "desktop"
          ? "ব্রাউজারের ঠিকানা বারের ডানদিকে ইনস্টল (⊕) আইকনে চাপুন।"
          : "Chrome-এর মেনু (⋮) খুলুন → “Install app” বা “অ্যাপ ইনস্টল করুন” চাপুন।",
    );
  }

  return (
    <div className="w-full">
      {!installed && deferred && (
        <p className="mb-3 text-center text-[13px] text-white/80">
          ✅ আপনার ফোনে ইনস্টল করার জন্য প্রস্তুত
        </p>
      )}

      {installed ? (
        <Link
          href="/app"
          className="btn w-full bg-white py-4 text-[17px] font-bold text-[var(--brand-600)] shadow-xl shadow-black/10"
        >
          অ্যাপ খুলুন →
        </Link>
      ) : (
        <button
          onClick={install}
          className="btn relative w-full overflow-hidden bg-white py-4 text-[17px] font-bold text-[var(--brand-600)] shadow-xl shadow-black/10"
        >
          <span className="text-xl">📥</span> অ্যাপ ইনস্টল করুন
          {deferred && (
            <span className="absolute inset-0 animate-pulse rounded-[14px] ring-2 ring-white/60" />
          )}
        </button>
      )}

      {hint && (
        <p className="mt-3 rounded-xl bg-white/15 px-3.5 py-2.5 text-center text-[13px] leading-relaxed text-white backdrop-blur">
          {hint}
        </p>
      )}
    </div>
  );
}
