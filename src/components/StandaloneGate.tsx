"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * অ্যাপটি ইনস্টল করা অবস্থায় (standalone) খোলা হলে
 * ডাউনলোড পাতা না দেখিয়ে সরাসরি অ্যাপে পাঠিয়ে দেয়।
 */
export default function StandaloneGate() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (standalone) {
      router.replace("/app");
      return;
    }
    const id = window.setTimeout(() => setChecking(false), 0);
    return () => window.clearTimeout(id);
  }, [router]);

  if (!checking) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--canvas)]">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[var(--brand-100)] border-t-[var(--brand-500)]" />
    </div>
  );
}
