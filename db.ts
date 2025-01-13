const kv = await Deno.openKv();

type Sender = "user" | "agent";
type Message = {
  sender: Sender;
  content: string;
  messageId: string;
  timestamp: number;
};

type Chat = {
  messages: Message[];
};

export const saveMessage = async (payload: {
  userId: string;
  messageId: string;
  content: string;
  sender: Sender;
}) => {
  const key = ["chat", payload.userId];
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

export const getConversation = async (userId: string) => {
  const key = ["chat", userId];
  const res = await kv.get<Chat>(key);
  return res.value?.messages ?? []; // Return messages array or empty array
};
