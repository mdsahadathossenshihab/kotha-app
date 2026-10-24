# 📦 কথা অ্যাপের APK কীভাবে বানাবেন

অ্যাপটি এখনই **অ্যান্ড্রয়েড অ্যাপ হিসেবে ইনস্টল** হয় (Chrome স্বয়ংক্রিয়ভাবে WebAPK তৈরি করে —
হোম স্ক্রিনে আইকন বসে, অ্যাপ ড্রয়ারে দেখা যায়, ব্রাউজার বার ছাড়া ফুল-স্ক্রিনে চলে)।

আপনি যদি **শেয়ার করার মতো একটি `.apk` ফাইল** চান (প্লে-স্টোরে দেওয়ার জন্য বা
সরাসরি পাঠানোর জন্য), নিচের যেকোনো একটি উপায় বেছে নিন।

---

## উপায় ১ — PWABuilder (সবচেয়ে সহজ, কোডিং লাগে না) ⭐

1. ব্রাউজারে যান → **https://www.pwabuilder.com**
2. আপনার অ্যাপের লিংকটি বসান (যেমনঃ `https://your-app.com`) → **Start** চাপুন
3. **Android** কার্ডে → **Generate Package** চাপুন
4. নিচের তথ্যগুলো দিন:
   - Package ID: `app.kotha.bangla`
   - App name: `কথা`
   - Start URL: `/app`
5. **Download** চাপলে একটি ZIP পাবেন — ভেতরে **`app-release-signed.apk`** আছে
6. সেই APK ফোনে পাঠিয়ে ইনস্টল করুন ✅

> ZIP-এর ভেতরের `assetlinks.json` ফাইলটি আপনার সার্ভারে
> `/.well-known/assetlinks.json` ঠিকানায় রাখলে অ্যাড্রেস-বারটিও সম্পূর্ণ লুকিয়ে যাবে।

---

## উপায় ২ — Bubblewrap (কমান্ড লাইন)

আপনার কম্পিউটারে **Node.js** ও **JDK 17** থাকতে হবে।

```bash
npm install -g @bubblewrap/cli

# এই ফোল্ডারের twa-manifest.json ফাইলে
# REPLACE_WITH_YOUR_DOMAIN জায়গায় আপনার ডোমেইন বসান, তারপর:

bubblewrap init --manifest=https://your-app.com/manifest.webmanifest
bubblewrap build
```

তৈরি হবে → **`app-release-signed.apk`**

---

## 🎤 মাইক্রোফোনের অনুমতি

APK-তে অডিও কল চালাতে `twa-manifest.json`-এ এই অনুমতিগুলো আগেই দেওয়া আছে:

- `RECORD_AUDIO` — কথা বলার জন্য
- `MODIFY_AUDIO_SETTINGS` — স্পিকার/ইয়ারপিস
- `VIBRATE` — ইনকামিং কলে কাঁপুনি
- `WAKE_LOCK` — কলের সময় স্ক্রিন চালু রাখা

---

## 💡 মনে রাখবেন

APK বানানোর জন্য **অ্যাপটি একটি স্থায়ী HTTPS ঠিকানায়** থাকা দরকার
(যেমন Vercel, Netlify বা আপনার নিজের ডোমেইন)। স্যান্ডবক্সের অস্থায়ী লিংক দিয়ে
APK বানালে লিংক বদলে গেলে অ্যাপ কাজ করবে না।
