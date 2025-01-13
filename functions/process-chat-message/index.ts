import "jsr:@std/dotenv/load";
import { requireRedis } from "../../redis.ts";
import { saveMessage } from "../../db.ts";

export async function listenToChatMessages() {
  const client = await requireRedis();
  const sub = await client.subscribe("chat:input");

  (async function () {
    for await (const { channel, message } of sub.receive()) {
      const parsedMessage = JSON.parse(message);
      const messageResponse = await saveMessage({
        userId: parsedMessage.userId,
        messageId: parsedMessage.messageId,
        content: parsedMessage.message,
        sender: "user",
      });
      console.log(channel, messageResponse);
    }
  })();
  return !sub.isClosed;
}

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  const response = await listenToChatMessages();
  console.log("Sentinel deployed", response);
}
