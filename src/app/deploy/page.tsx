import DeployPanel from "@/components/DeployPanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ফোন থেকে আপলোড — কথা",
  description: "এক ট্যাপে পুরো প্রজেক্ট GitHub-এ পাঠান, তারপর ভার্সেলে ডিপ্লয় করুন।",
};

export default function DeployPage() {
  return <DeployPanel />;
}
