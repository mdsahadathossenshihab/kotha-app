export type PublicUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  about: string;
  avatar: string;
  color: string;
  lastSeen: string;
};

export type ChatSummary = {
  id: number;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  partner: PublicUser;
};

export type ChatMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  kind: "text" | "voice" | "call" | "image" | string;
  body: string;
  mediaUrl: string;
  durationSec: number;
  seenAt: string | null;
  createdAt: string;
};

export type CallState = {
  id: number;
  callerId: number;
  calleeId: number;
  conversationId: number;
  status: "ringing" | "active" | "ended" | "rejected" | "missed" | string;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  role: "caller" | "callee";
  peer: PublicUser | null;
};

export type CallLog = {
  id: number;
  status: string;
  role: "caller" | "callee";
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSec: number;
  peer: PublicUser | null;
};
