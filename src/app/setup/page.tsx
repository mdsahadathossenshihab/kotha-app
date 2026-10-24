import SmsSetup from "@/components/SmsSetup";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ইমেইল সার্ভিস সেটআপ — কথা",
  description: "জিমেইলে OTP কোড পাঠানোর জন্য ইমেইল সার্ভিস যুক্ত করুন।",
};

export default function SetupPage() {
  return <SmsSetup />;
}
