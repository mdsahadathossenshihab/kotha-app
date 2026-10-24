"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import { useCall } from "@/components/CallProvider";
import { api, bn, duration, formatDay, formatTime, onlineStatus } from "@/lib/client";
import { fileToPhoto } from "@/lib/image";
import type { ChatMessage, PublicUser } from "@/lib/types";

const QUICK = ["👍", "❤️", "😂", "🙏", "😍", "😢", "🔥", "🎉", "👌", "😊"];

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const chatId = Number(params.id);
  const { startCall } = useCall();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partner, setPartner] = useState<PublicUser | null>(null);
  const [meId, setMeId] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [showQuick, setShowQuick] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef(0);

  const scrollDown = useCallback((smooth = true) => {
    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" }),
    );
  }, []);

  useEffect(() => {
    if (!chatId) return;
    let stop = false;
    const load = async () => {
      try {
        const res = await api<{
          messages: ChatMessage[];
          partner: PublicUser | null;
          meId: number;
        }>(`/api/chats/${chatId}/messages?after=${lastIdRef.current}`);
        if (stop) return;
        setPartner(res.partner);
        setMeId(res.meId);
        if (res.messages.length) {
          const first = lastIdRef.current === 0;
          lastIdRef.current = res.messages[res.messages.length - 1].id;
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            return [...prev, ...res.messages.filter((m) => !seen.has(m.id))];
          });
          scrollDown(!first);
        }
      } catch {
        /* উপেক্ষা */
      }
    };
    void load();
    const id = setInterval(load, 2000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [chatId, scrollDown]);

  const push = useCallback(
    (message: ChatMessage) => {
      lastIdRef.current = Math.max(lastIdRef.current, message.id);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      scrollDown();
    },
    [scrollDown],
  );

  const send = useCallback(
    async (payload: { kind: string; body?: string; mediaUrl?: string; durationSec?: number }) => {
      setSending(true);
      try {
        const res = await api<{ message: ChatMessage }>(`/api/chats/${chatId}/messages`, {
          method: "POST",
          body: payload,
        });
        push(res.message);
      } catch {
        /* উপেক্ষা */
      } finally {
        setSending(false);
      }
    },
    [chatId, push],
  );

  async function sendText(e?: React.FormEvent) {
    e?.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    await send({ kind: "text", body: value });
  }

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await send({ kind: "image", mediaUrl: await fileToPhoto(file), body: "ছবি" });
  }

  async function toggleRecord() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recStartRef.current = Date.now();
      recorder.ondataavailable = (ev) => ev.data.size && chunksRef.current.push(ev.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const secs = Math.round((Date.now() - recStartRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1200 || secs < 1) return;
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(blob);
        });
        await send({ kind: "voice", mediaUrl: base64, durationSec: secs, body: "ভয়েস বার্তা" });
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setRecSec(0);
    } catch {
      alert("মাইক্রোফোন ব্যবহারের অনুমতি দিন");
    }
  }

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setRecSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  const status = partner ? onlineStatus(partner.lastSeen) : null;
  let lastDay = "";

  return (
    <div className="flex h-full flex-col">
      {/* হেডার */}
      <header className="brand-grad flex items-center gap-2.5 px-2.5 py-2.5 text-white">
        <Link
          href="/app"
          className="flex h-9 w-9 items-center justify-center rounded-full text-2xl leading-none active:bg-white/15"
        >
          ‹
        </Link>
        <Avatar
          name={partner?.name ?? "?"}
          avatar={partner?.avatar}
          color={partner?.color}
          size={38}
          online={status?.online}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">
            {partner?.name ?? "…"}
          </p>
          <p className="truncate text-[11px] text-white/75">{status?.text ?? ""}</p>
        </div>
        <button
          onClick={() => partner && startCall(partner)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/16 active:scale-95"
          aria-label="অডিও কল"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M6.6 3.5h-.9A2.7 2.7 0 0 0 3 6.4C3 14.5 9.5 21 17.6 21a2.7 2.7 0 0 0 2.9-2.7v-.9a1.4 1.4 0 0 0-1-1.3l-3-.9a1.4 1.4 0 0 0-1.5.5l-.8 1a12.4 12.4 0 0 1-5-5l1-.8a1.4 1.4 0 0 0 .5-1.5l-.9-3a1.4 1.4 0 0 0-1.2-.9Z" />
          </svg>
        </button>
      </header>

      {/* বার্তা */}
      <div className="chat-canvas thin-scroll flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 && (
          <div className="mx-auto mt-10 max-w-[260px] text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
              👋
            </div>
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              {partner?.name ?? "বন্ধু"}-কে প্রথম বার্তাটি পাঠান
            </p>
          </div>
        )}

        {messages.map((m) => {
          const mine = m.senderId === meId;
          const day = formatDay(m.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;

          if (m.kind === "call") {
            return (
              <div key={m.id} className="my-3 flex justify-center">
                <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] text-[var(--ink-soft)] shadow-sm">
                  📞 {m.body}
                  {m.durationSec > 0 ? ` • ${duration(m.durationSec)}` : ""}
                </span>
              </div>
            );
          }

          return (
            <div key={m.id}>
              {showDay && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-medium text-[var(--ink-soft)] shadow-sm">
                    {day}
                  </span>
                </div>
              )}
              <div className={`mb-2 flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`rise max-w-[80%] px-3 py-2 ${mine ? "bubble-out" : "bubble-in"}`}
                >
                  {m.kind === "image" && m.mediaUrl && (
                    <button onClick={() => setPreview(m.mediaUrl)} className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.mediaUrl}
                        alt="ছবি"
                        className="mb-1 max-h-72 w-full rounded-xl object-cover"
                      />
                    </button>
                  )}
                  {m.kind === "voice" && m.mediaUrl && (
                    <div className="flex items-center gap-2 py-0.5">
                      <span className="text-lg">🎤</span>
                      <audio controls src={m.mediaUrl} className="h-8 w-44" />
                      <span className={`text-[10px] ${mine ? "text-white/75" : "text-slate-400"}`}>
                        {duration(m.durationSec)}
                      </span>
                    </div>
                  )}
                  {m.kind === "text" && (
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                      {m.body}
                    </p>
                  )}
                  <div
                    className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${
                      mine ? "text-white/70" : "text-slate-400"
                    }`}
                  >
                    {formatTime(m.createdAt)}
                    {mine && <span>{m.seenAt ? "✓✓" : "✓"}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ইমোজি সারি */}
      {showQuick && (
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-t border-[var(--line)] bg-white px-3 py-2">
          {QUICK.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setShowQuick(false);
                void send({ kind: "text", body: emoji });
              }}
              className="shrink-0 rounded-xl px-2 py-1 text-2xl active:scale-90 active:bg-slate-100"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* ইনপুট */}
      <form
        onSubmit={sendText}
        className="safe-b flex items-end gap-1.5 border-t border-[var(--line)] bg-white px-2 py-2"
      >
        <button
          type="button"
          onClick={() => setShowQuick((s) => !s)}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl transition ${
            showQuick ? "bg-[var(--brand-50)]" : "text-slate-500"
          }`}
          aria-label="ইমোজি"
        >
          😊
        </button>
        <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl text-slate-500">
          📎
          <input type="file" accept="image/*" onChange={pickImage} className="hidden" />
        </label>

        {recording ? (
          <div className="flex h-10 flex-1 items-center gap-2 rounded-full bg-rose-50 px-4 text-sm font-medium text-rose-600">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
            রেকর্ড হচ্ছে… {bn(recSec)} সে.
          </div>
        ) : (
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="বার্তা লিখুন…"
            className="h-10 flex-1 rounded-full border border-[var(--line)] bg-[#f6f8fc] px-4 text-[15px] outline-none focus:border-[var(--brand-400)] focus:bg-white"
          />
        )}

        {text.trim() && !recording ? (
          <button
            type="submit"
            disabled={sending}
            className="btn btn-primary h-10 w-10 shrink-0 !rounded-full text-lg"
            aria-label="পাঠান"
          >
            ➤
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleRecord}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg transition active:scale-95 ${
              recording ? "bg-rose-500 text-white" : "btn-soft"
            }`}
            aria-label="ভয়েস বার্তা"
          >
            {recording ? "⏹" : "🎤"}
          </button>
        )}
      </form>

      {/* ছবি প্রিভিউ */}
      {preview && (
        <button
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="ছবি" className="max-h-full max-w-full rounded-xl" />
          <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white">
            ✕
          </span>
        </button>
      )}
    </div>
  );
}
