import { Message, Sender } from "./types.ts";

const kv = await Deno.openKv(Deno.env.get("DENO_KV_PATH"));

export const saveMessage = async (payload: {
  userId: string;
  agentId?: string;
  messageId: string;
  content: string;
  sender: Sender;
}) => {
  const key = [
    payload.userId,
    "chat",
    payload.agentId ?? "general",
    payload.messageId,
  ];
  const value = {
    sender: payload.sender,
    content: payload.content,
    timestamp: Date.now(),
    messageId: payload.messageId,
  } satisfies Message;

  const res = await kv
    .atomic()
    .check({ key, versionstamp: null }) // Correctly uses existingValue
    .set(key, value)
    .commit();

  if (res.ok) {
    return { ok: true, messageId: payload.messageId };
  }
};

export const getMessagesByUserId = async (userId: string, agentId?: string) => {
  const prefix = [userId, "chat", agentId || "general"];
  const iter = kv.list<Message>({ prefix }, { limit: 50 });

  const messages = [];
  for await (const res of iter) messages.push(res);
  return messages;
};
