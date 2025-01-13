import { Chat, Message, Sender } from "./types.ts";

const kv = await Deno.openKv(Deno.env.get("DENO_KV_PATH"));

export const saveMessage = async (payload: {
  userId: string;
  agentId?: string;
  messageId: string;
  content: string;
  sender: Sender;
}) => {
  const key = ["chat", payload.userId, payload.agentId ?? "general"];
  const message = {
    sender: payload.sender,
    content: payload.content,
    timestamp: Date.now(),
    messageId: payload.messageId,
  } satisfies Message;

  while (true) {
    const existingValue = await kv.get(key);

    if (existingValue.value === null) {
      const res = await kv.set(key, { messages: [message] });
      if (res.ok) {
        return { ok: true, messageId: payload.messageId };
      }
      continue; // Retry if set failed (very unlikely)
    }

    const res = await kv
      .atomic()
      .check(existingValue) // Correctly uses existingValue
      .set(key, (oldValue: Chat) => {
        if (
          !oldValue ||
          !("messages" in oldValue) ||
          !Array.isArray(oldValue.messages)
        ) {
          return { messages: [message] }; // Handle edge cases
        }
        if (oldValue.messages.some((m) => m.messageId === payload.messageId)) {
          return oldValue; // Message already exists
        }
        return { messages: [...oldValue.messages, message] };
      })
      .commit();

    if (res.ok) {
      return { ok: true, messageId: payload.messageId };
    }
    // No need to check res.versionstamp here, just retry the loop
  }
};
