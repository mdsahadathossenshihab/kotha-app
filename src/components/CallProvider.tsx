"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Avatar from "@/components/Avatar";
import { api, duration } from "@/lib/client";
import type { CallState, PublicUser } from "@/lib/types";

type Phase = "idle" | "outgoing" | "incoming" | "connecting" | "active" | "ended";

type Ctx = {
  startCall: (user: PublicUser) => void;
  busy: boolean;
  notice: string;
};

const CallContext = createContext<Ctx>({ startCall: () => {}, busy: false, notice: "" });
export const useCall = () => useContext(CallContext);

/**
 * STUN + TURN। TURN ছাড়া মোবাইল ডেটা/ক্যারিয়ার NAT-এ কল কানেক্ট হয় না —
 * তাই ফ্রি OpenRelay TURN রিলে যুক্ত করা হয়েছে।
 */
const ICE: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 4,
};

type WakeLock = { release: () => Promise<void> };

export default function CallProvider({ children }: { children: ReactNode }) {
  const [call, setCall] = useState<CallState | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSignalRef = useRef(0);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const offerRef = useRef<RTCSessionDescriptionInit | null>(null);
  const remoteSet = useRef(false);
  const answeredRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  const callRef = useRef<CallState | null>(null);
  const toneRef = useRef<(() => void) | null>(null);
  const wakeRef = useRef<WakeLock | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  const flash = useCallback((text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 3200);
  }, []);

  /* ---------------- রিংটোন ---------------- */
  const stopTone = useCallback(() => {
    toneRef.current?.();
    toneRef.current = null;
  }, []);

  const playTone = useCallback(
    (kind: "in" | "out") => {
      stopTone();
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctor();
        void ctx.resume?.();

        const beep = () => {
          const now = ctx.currentTime;
          const notes = kind === "in" ? [784, 988] : [440];
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            const t = now + i * 0.22;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.1, t + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.55);
          });
        };

        beep();
        const timer = window.setInterval(beep, kind === "in" ? 2000 : 3000);
        toneRef.current = () => {
          window.clearInterval(timer);
          ctx.close().catch(() => {});
        };
      } catch {
        /* শব্দ না বাজলেও কল চলবে */
      }
    },
    [stopTone],
  );

  /* ---------------- স্ক্রিন জাগিয়ে রাখা ---------------- */
  const keepAwake = useCallback(async (on: boolean) => {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (t: "screen") => Promise<WakeLock> };
      };
      if (on && nav.wakeLock && !wakeRef.current) {
        wakeRef.current = await nav.wakeLock.request("screen");
      } else if (!on && wakeRef.current) {
        await wakeRef.current.release();
        wakeRef.current = null;
      }
    } catch {
      /* উপেক্ষা */
    }
  }, []);

  /* ---------------- পরিষ্কার করা ---------------- */
  const teardown = useCallback(
    (message: string) => {
      stopTone();
      void keepAwake(false);
      try {
        pcRef.current?.getSenders().forEach((s) => s.track?.stop());
        pcRef.current?.close();
      } catch {
        /* উপেক্ষা */
      }
      pcRef.current = null;
      localRef.current?.getTracks().forEach((t) => t.stop());
      localRef.current = null;
      if (audioRef.current) audioRef.current.srcObject = null;
      lastSignalRef.current = 0;
      pendingIce.current = [];
      offerRef.current = null;
      remoteSet.current = false;
      answeredRef.current = false;
      setMuted(false);
      setSpeaker(true);
      setSeconds(0);
      setNote(message);
      setPhase("ended");
      window.setTimeout(() => {
        setPhase((p) => (p === "ended" ? "idle" : p));
        setCall(null);
        setNote("");
      }, 1800);
    },
    [keepAwake, stopTone],
  );

  const sendSignal = useCallback(async (callId: number, kind: string, payload: unknown) => {
    try {
      await api(`/api/calls/${callId}/signals`, { method: "POST", body: { kind, payload } });
    } catch {
      /* উপেক্ষা */
    }
  }, []);

  /* ---------------- পিয়ার কানেকশন ---------------- */
  const createPeer = useCallback(
    async (callId: number) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      localRef.current = stream;

      const pc = new RTCPeerConnection(ICE);
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) void sendSignal(callId, "candidate", event.candidate.toJSON());
      };

      pc.ontrack = (event) => {
        const el = audioRef.current;
        if (!el) return;
        el.srcObject = event.streams[0];
        el.muted = false;
        el.volume = 1;
        const tryPlay = () => el.play().catch(() => window.setTimeout(tryPlay, 400));
        tryPlay();
      };

      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === "connected") {
          stopTone();
          answeredRef.current = true;
          setPhase("active");
          void keepAwake(true);
        } else if (s === "failed") {
          teardown("সংযোগ করা যায়নি — ইন্টারনেট দেখুন");
        } else if (s === "disconnected") {
          setNote("সংযোগ দুর্বল…");
        }
      };

      return pc;
    },
    [keepAwake, sendSignal, stopTone, teardown],
  );

  /* ---------------- কল শুরু ---------------- */
  const startCall = useCallback(
    (user: PublicUser) => {
      if (phaseRef.current !== "idle") {
        flash("আপনি এখন একটি কলে আছেন");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        flash("এই ব্রাউজারে কল সমর্থিত নয়");
        return;
      }

      // দ্রুত দুইবার চাপ দিলে যেন দুটি কল না হয়
      phaseRef.current = "outgoing";

      setCall({
        id: 0,
        callerId: 0,
        calleeId: user.id,
        conversationId: 0,
        status: "ringing",
        startedAt: new Date().toISOString(),
        answeredAt: null,
        endedAt: null,
        role: "caller",
        peer: user,
      });
      setPhase("outgoing");
      setNote("সংযোগ করা হচ্ছে…");

      void (async () => {
        try {
          const pc0 = await createPeer(0);
          const res = await api<{ call: CallState }>("/api/calls", {
            method: "POST",
            body: { userId: user.id },
          });

          // সঠিক callId দিয়ে ICE পাঠানোর জন্য হ্যান্ডলার আপডেট
          pc0.onicecandidate = (event) => {
            if (event.candidate)
              void sendSignal(res.call.id, "candidate", event.candidate.toJSON());
          };

          setCall({ ...res.call, peer: user });
          const offer = await pc0.createOffer({ offerToReceiveAudio: true });
          await pc0.setLocalDescription(offer);
          await sendSignal(res.call.id, "offer", offer);
          setNote("রিং হচ্ছে…");
          playTone("out");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          teardown(
            /permission|denied|notallowed/i.test(msg)
              ? "মাইক্রোফোনের অনুমতি দিন"
              : "কল করা যায়নি",
          );
        }
      })();
    },
    [createPeer, flash, playTone, sendSignal, teardown],
  );

  /* ---------------- কল ধরা ---------------- */
  const acceptCall = useCallback(() => {
    const current = callRef.current;
    if (!current || phaseRef.current !== "incoming") return;
    stopTone();
    setPhase("connecting");
    setNote("সংযোগ করা হচ্ছে…");

    void (async () => {
      try {
        await api(`/api/calls/${current.id}`, { method: "PATCH", body: { status: "active" } });
        const pc = await createPeer(current.id);

        // অফার আসা পর্যন্ত অপেক্ষা (সর্বোচ্চ ৮ সেকেন্ড)
        for (let i = 0; i < 40 && !offerRef.current; i++) {
          await new Promise((r) => setTimeout(r, 200));
        }
        if (!offerRef.current) {
          teardown("কল সংযোগ করা যায়নি");
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offerRef.current));
        remoteSet.current = true;
        for (const c of pendingIce.current) await pc.addIceCandidate(c).catch(() => {});
        pendingIce.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal(current.id, "answer", answer);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        teardown(
          /permission|denied|notallowed/i.test(msg)
            ? "মাইক্রোফোনের অনুমতি দিন"
            : "কল ধরা যায়নি",
        );
      }
    })();
  }, [createPeer, sendSignal, stopTone, teardown]);

  const endCall = useCallback(
    (status: "ended" | "rejected") => {
      const current = callRef.current;
      if (current?.id) {
        void api(`/api/calls/${current.id}`, { method: "PATCH", body: { status } }).catch(
          () => {},
        );
      }
      teardown(status === "rejected" ? "কল কেটে দেওয়া হয়েছে" : "কল শেষ হয়েছে");
    },
    [teardown],
  );

  const toggleMute = useCallback(() => {
    const stream = localRef.current;
    if (!stream) return;
    setMuted((prev) => {
      const next = !prev;
      stream.getAudioTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    const el = audioRef.current as
      | (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> })
      | null;
    setSpeaker((prev) => {
      const next = !prev;
      if (el) {
        el.volume = next ? 1 : 0.4;
        el.setSinkId?.(next ? "default" : "default").catch(() => {});
      }
      return next;
    });
  }, []);

  /* ---------------- ইনকামিং কল খোঁজা ---------------- */
  useEffect(() => {
    if (phase !== "idle") return;
    let stop = false;

    const tick = async () => {
      try {
        const res = await api<{ call: CallState | null }>("/api/calls");
        if (stop || !res.call) return;
        if (res.call.role === "callee" && res.call.status === "ringing") {
          lastSignalRef.current = 0;
          pendingIce.current = [];
          offerRef.current = null;
          remoteSet.current = false;
          setCall(res.call);
          setPhase("incoming");
          playTone("in");
          navigator.vibrate?.([500, 300, 500, 300]);
        }
      } catch {
        /* উপেক্ষা */
      }
    };

    void tick();
    const id = setInterval(tick, 2000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [phase, playTone]);

  /* ---------------- সিগন্যাল ও অবস্থা ---------------- */
  useEffect(() => {
    const callId = call?.id ?? 0;
    if (!callId || phase === "idle" || phase === "ended") return;
    let stop = false;

    const tick = async () => {
      if (stop) return;
      try {
        const state = await api<{ call: CallState }>(`/api/calls/${callId}`);
        if (stop) return;

        if (state.call.status === "ended" || state.call.status === "rejected") {
          teardown(
            answeredRef.current
              ? "কল শেষ হয়েছে"
              : state.call.status === "rejected"
                ? "কল গ্রহণ করা হয়নি"
                : "কল কেটে দেওয়া হয়েছে",
          );
          return;
        }
        if (state.call.status === "active" && phaseRef.current === "outgoing") {
          stopTone();
          setPhase("connecting");
          setNote("সংযোগ করা হচ্ছে…");
        }

        const res = await api<{ signals: { id: number; kind: string; payload: string }[] }>(
          `/api/calls/${callId}/signals?after=${lastSignalRef.current}`,
        );

        for (const sig of res.signals) {
          lastSignalRef.current = Math.max(lastSignalRef.current, sig.id);
          const payload = JSON.parse(sig.payload || "null");
          const pc = pcRef.current;

          if (sig.kind === "offer") {
            offerRef.current = payload as RTCSessionDescriptionInit;
          } else if (sig.kind === "answer" && pc && !remoteSet.current) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
            remoteSet.current = true;
            for (const c of pendingIce.current) await pc.addIceCandidate(c).catch(() => {});
            pendingIce.current = [];
          } else if (sig.kind === "candidate" && payload) {
            if (pc && remoteSet.current) {
              await pc.addIceCandidate(payload as RTCIceCandidateInit).catch(() => {});
            } else {
              pendingIce.current.push(payload as RTCIceCandidateInit);
            }
          }
        }
      } catch {
        /* উপেক্ষা */
      }
    };

    void tick();
    const id = setInterval(tick, 1200);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [call?.id, phase, stopTone, teardown]);

  /* ---------------- সময় গণনা ---------------- */
  useEffect(() => {
    if (phase !== "active") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  /* ---------------- টাইমআউট ---------------- */
  useEffect(() => {
    if (phase === "idle" || phase === "ended" || phase === "active") return;
    const limit = phase === "connecting" ? 25_000 : 45_000;
    const id = setTimeout(() => {
      const p = phaseRef.current;
      if (p === "active" || p === "idle" || p === "ended") return;
      if (p === "connecting") teardown("সংযোগ করা যায়নি — আবার চেষ্টা করুন");
      else endCall(p === "incoming" ? "rejected" : "ended");
    }, limit);
    return () => clearTimeout(id);
  }, [phase, endCall, teardown]);

  const peer = call?.peer;
  const show = phase !== "idle";

  const statusText =
    phase === "incoming"
      ? "ইনকামিং অডিও কল"
      : phase === "outgoing"
        ? note || "রিং হচ্ছে…"
        : phase === "connecting"
          ? note || "সংযোগ করা হচ্ছে…"
          : phase === "active"
            ? duration(seconds)
            : note || "কল শেষ";

  return (
    <CallContext.Provider value={{ startCall, busy: phase !== "idle", notice }}>
      {children}

      <audio
        ref={audioRef}
        autoPlay
        playsInline
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />

      {notice && !show && (
        <div className="fixed left-1/2 top-4 z-[60] w-[90%] max-w-sm -translate-x-1/2 rounded-xl bg-slate-900/90 px-4 py-2.5 text-center text-sm text-white shadow-xl backdrop-blur">
          {notice}
        </div>
      )}

      {show && (
        <div className="brand-grad mesh fixed inset-0 z-[70] flex flex-col text-white">
          {/* উপরের অংশ */}
          <div className="relative flex flex-1 flex-col items-center justify-center px-6">
            <div className="relative">
              {(phase === "incoming" || phase === "outgoing") && (
                <span className="ring-pulse absolute inset-0 block rounded-full" />
              )}
              <Avatar
                name={peer?.name ?? "?"}
                avatar={peer?.avatar}
                color="#ffffff33"
                size={140}
                ring
              />
            </div>

            <h2 className="mt-6 text-center text-[26px] font-bold leading-tight">
              {peer?.name ?? "অজানা"}
            </h2>

            <p
              className={`mt-2 text-center ${
                phase === "active"
                  ? "text-[22px] font-semibold tabular-nums"
                  : "text-[15px] text-white/85"
              }`}
            >
              {statusText}
            </p>

            <div className="mt-4 flex items-center gap-2">
              {phase === "active" ? (
                <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                  সংযুক্ত
                </span>
              ) : phase !== "ended" ? (
                <span className="rounded-full bg-white/15 px-3.5 py-1.5 text-xs backdrop-blur">
                  🔒 সুরক্ষিত অডিও কল
                </span>
              ) : null}
              {muted && phase === "active" && (
                <span className="rounded-full bg-rose-500/80 px-3 py-1.5 text-xs">
                  🔇 মাইক বন্ধ
                </span>
              )}
            </div>
          </div>

          {/* বাটন */}
          <div className="safe-b px-8 pb-10">
            {phase === "incoming" ? (
              <div className="flex items-end justify-between">
                <CallBtn
                  onClick={() => endCall("rejected")}
                  label="কেটে দিন"
                  className="bg-rose-500"
                  icon={<IconDecline />}
                />
                <CallBtn
                  onClick={acceptCall}
                  label="ধরুন"
                  className="animate-bounce bg-emerald-500"
                  icon={<IconPhone />}
                />
              </div>
            ) : (
              <div className="flex items-end justify-center gap-7">
                <SmallBtn
                  onClick={toggleMute}
                  disabled={phase !== "active"}
                  active={muted}
                  label={muted ? "আনমিউট" : "মিউট"}
                  icon={muted ? "🔇" : "🎙️"}
                />
                <CallBtn
                  onClick={() => endCall("ended")}
                  label={phase === "ended" ? "শেষ" : "কল শেষ"}
                  className="bg-rose-500"
                  icon={<IconDecline />}
                />
                <SmallBtn
                  onClick={toggleSpeaker}
                  disabled={phase !== "active"}
                  active={!speaker}
                  label={speaker ? "স্পিকার" : "কম শব্দ"}
                  icon={speaker ? "🔊" : "🔉"}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </CallContext.Provider>
  );
}

function CallBtn({
  onClick,
  label,
  icon,
  className = "",
}: {
  onClick: () => void;
  label: string;
  icon: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        className={`flex h-[68px] w-[68px] items-center justify-center rounded-full shadow-xl transition active:scale-90 ${className}`}
        aria-label={label}
      >
        {icon}
      </button>
      <span className="text-[11px] text-white/80">{label}</span>
    </div>
  );
}

function SmallBtn({
  onClick,
  disabled,
  active,
  label,
  icon,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
  icon: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex h-14 w-14 items-center justify-center rounded-full text-xl transition active:scale-90 disabled:opacity-35 ${
          active ? "bg-white text-slate-800" : "bg-white/20 backdrop-blur"
        }`}
        aria-label={label}
      >
        {icon}
      </button>
      <span className="text-[11px] text-white/70">{label}</span>
    </div>
  );
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="currentColor">
      <path d="M6.6 3.5h-.9A2.7 2.7 0 0 0 3 6.4C3 14.5 9.5 21 17.6 21a2.7 2.7 0 0 0 2.9-2.7v-.9a1.4 1.4 0 0 0-1-1.3l-3-.9a1.4 1.4 0 0 0-1.5.5l-.8 1a12.4 12.4 0 0 1-5-5l1-.8a1.4 1.4 0 0 0 .5-1.5l-.9-3a1.4 1.4 0 0 0-1.2-.9Z" />
    </svg>
  );
}

function IconDecline() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 rotate-[135deg] text-white" fill="currentColor">
      <path d="M6.6 3.5h-.9A2.7 2.7 0 0 0 3 6.4C3 14.5 9.5 21 17.6 21a2.7 2.7 0 0 0 2.9-2.7v-.9a1.4 1.4 0 0 0-1-1.3l-3-.9a1.4 1.4 0 0 0-1.5.5l-.8 1a12.4 12.4 0 0 1-5-5l1-.8a1.4 1.4 0 0 0 .5-1.5l-.9-3a1.4 1.4 0 0 0-1.2-.9Z" />
    </svg>
  );
}
