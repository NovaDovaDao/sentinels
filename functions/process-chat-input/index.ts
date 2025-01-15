import "jsr:@std/dotenv/load";
import { requireRedis } from "../../redis.ts";
import { saveMessage } from "../../db.ts";
import * as uuid from "jsr:@std/uuid";

const N8N_DOVA_WEBHOOK = Deno.env.get("N8N_DOVA_WEBHOOK");
const N8N_DOVA_WEBHOOK_USER = Deno.env.get("N8N_DOVA_WEBHOOK_USER");
const N8N_DOVA_WEBHOOK_PASSWORD = Deno.env.get("N8N_DOVA_WEBHOOK_PASSWORD");

export async function processChatInput() {
  if (!N8N_DOVA_WEBHOOK || !N8N_DOVA_WEBHOOK_USER || !N8N_DOVA_WEBHOOK_PASSWORD)
    throw "Missing n8n env variables";

  const client = await requireRedis();
  const sub = await client.subscribe("chat_input");

  (async function () {
    for await (const { message } of sub.receive()) {
      const parsedMessage = JSON.parse(message);
      /**
       *
       * save user message
       */
      const messageResponse = await saveMessage({
        userId: parsedMessage.userId,
        messageId: parsedMessage.messageId,
        content: parsedMessage.message,
        sender: "user",
      });

      if (messageResponse?.ok) {
        const encodedCredentials = btoa(
          `${N8N_DOVA_WEBHOOK_USER}:${N8N_DOVA_WEBHOOK_PASSWORD}`
        );
        await fetch(N8N_DOVA_WEBHOOK, {
          method: "POST",
          headers: {
            Authorization: `Basic ${encodedCredentials}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "sendMessage",
            sessionId: parsedMessage.userId,
            chatInput: parsedMessage.message,
            messageId: uuid.v1.generate(),
          }),
        });
      }
    }
  })();
  return !sub.isClosed;
}

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  const response = await processChatInput();
  console.log("Sentinels listening to chat input...", response);
}
