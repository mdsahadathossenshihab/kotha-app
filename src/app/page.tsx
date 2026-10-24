import InstallButton from "@/components/InstallButton";
import StandaloneGate from "@/components/StandaloneGate";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "কথা — অ্যাপ ইনস্টল করুন",
  description: "বাংলায় বিনামূল্যে মেসেজ ও অডিও কল। অ্যাপটি ফোনে ইনস্টল করে শুরু করুন।",
};

const STEPS = [
  { n: "১", text: "উপরের বাটনে চাপ দিন" },
  { n: "২", text: "“ইনস্টল / Add” নিশ্চিত করুন" },
  { n: "৩", text: "হোম স্ক্রিন থেকে অ্যাপ খুলুন" },
];

export default function HomePage() {
  return (
    <>
      <StandaloneGate />

      <main className="brand-grad mesh relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-10 text-white">
        <div className="relative w-full max-w-sm text-center">
          {/* আইকন */}
          <div className="slide-up mx-auto flex h-28 w-28 items-center justify-center rounded-[30px] bg-white/15 p-2 backdrop-blur">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/app-icon.png"
              alt="কথা"
              className="h-full w-full rounded-[24px] shadow-2xl"
            />
          </div>

          <h1 className="slide-up mt-6 text-[40px] font-bold leading-none">কথা</h1>
          <p className="slide-up mt-2.5 text-[15px] leading-relaxed text-white/85">
            বাংলায় ফ্রি মেসেজ ও অডিও কল
          </p>

          {/* ফিচার চিপ */}
          <div className="slide-up mt-5 flex flex-wrap items-center justify-center gap-2">
            {["💬 মেসেজ", "📞 অডিও কল", "🎤 ভয়েস", "🖼️ ছবি"].map((t) => (
              <span
                key={t}
                className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] backdrop-blur"
              >
                {t}
              </span>
            ))}
          </div>

          {/* ইনস্টল */}
          <div className="slide-up mt-8">
            <InstallButton />
          </div>

          {/* ধাপ */}
          <div className="slide-up mt-8 grid grid-cols-3 gap-2">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-[11px] font-bold">
                  {s.n}
                </span>
                <p className="mt-1.5 text-[11px] leading-snug text-white/85">{s.text}</p>
              </div>
            ))}
          </div>

          <p className="slide-up mt-7 text-[11px] leading-relaxed text-white/60">
            আকার ~১ MB • প্লে-স্টোর লাগবে না • অ্যান্ড্রয়েড ও আইফোনে চলে
          </p>
        </div>
      </main>
    </>
  );
}
