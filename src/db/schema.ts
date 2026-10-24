import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/** ব্যবহারকারী / অ্যাকাউন্ট (জিমেইল দিয়ে) */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 160 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    phone: varchar("phone", { length: 32 }).default("").notNull(),
    about: varchar("about", { length: 160 }).default("কথা অ্যাপে আছি!").notNull(),
    avatar: text("avatar").default("").notNull(),
    color: varchar("color", { length: 16 }).default("#0ea5e9").notNull(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

/** অ্যাপের সেটিংস (ইমেইল গেটওয়ে কনফিগারেশন ইত্যাদি) */
export const appSettings = pgTable(
  "app_settings",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 64 }).notNull(),
    value: text("value").default("").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("app_settings_key_idx").on(table.key)],
);

/** ইমেইল পাঠানোর লগ */
export const mailLogs = pgTable("mail_logs", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 160 }).notNull(),
  provider: varchar("provider", { length: 24 }).default("").notNull(),
  success: varchar("success", { length: 8 }).default("no").notNull(),
  detail: text("detail").default("").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** ইমেইলে পাঠানো OTP কোড */
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 160 }).notNull(),
    codeHash: varchar("code_hash", { length: 128 }).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    channel: varchar("channel", { length: 24 }).default("email").notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("otp_email_idx").on(table.email, table.id)],
);

/** যাদের অ্যাকাউন্ট নেই — তাদের পাঠানো আমন্ত্রণ */
export const invites = pgTable(
  "invites",
  {
    id: serial("id").primaryKey(),
    inviterId: integer("inviter_id").notNull(),
    email: varchar("email", { length: 160 }).notNull(),
    channel: varchar("channel", { length: 24 }).default("link").notNull(),
    joinedUserId: integer("joined_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("invites_email_idx").on(table.email)],
);

/** কন্টাক্ট তালিকা */
export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id").notNull(),
    contactId: integer("contact_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("contacts_pair_idx").on(table.ownerId, table.contactId)],
);

/** দুইজনের মধ্যে চ্যাট রুম */
export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    userAId: integer("user_a_id").notNull(),
    userBId: integer("user_b_id").notNull(),
    lastMessage: text("last_message").default("").notNull(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("conversations_pair_idx").on(table.userAId, table.userBId)],
);

/** মেসেজ (টেক্সট / ভয়েস / কল লগ / ছবি) */
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id").notNull(),
    senderId: integer("sender_id").notNull(),
    kind: varchar("kind", { length: 16 }).default("text").notNull(),
    body: text("body").default("").notNull(),
    mediaUrl: text("media_url").default("").notNull(),
    durationSec: integer("duration_sec").default(0).notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("messages_conversation_idx").on(table.conversationId, table.id)],
);

/** অডিও কল */
export const calls = pgTable(
  "calls",
  {
    id: serial("id").primaryKey(),
    callerId: integer("caller_id").notNull(),
    calleeId: integer("callee_id").notNull(),
    conversationId: integer("conversation_id").notNull(),
    status: varchar("status", { length: 16 }).default("ringing").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [index("calls_callee_idx").on(table.calleeId, table.status)],
);

/** WebRTC সিগন্যালিং বার্তা */
export const callSignals = pgTable(
  "call_signals",
  {
    id: serial("id").primaryKey(),
    callId: integer("call_id").notNull(),
    senderId: integer("sender_id").notNull(),
    kind: varchar("kind", { length: 16 }).notNull(),
    payload: text("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("call_signals_call_idx").on(table.callId, table.id)],
);

export type User = typeof users.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Call = typeof calls.$inferSelect;
