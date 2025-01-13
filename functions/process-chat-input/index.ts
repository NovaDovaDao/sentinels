import "jsr:@std/dotenv/load";
import { requireRedis } from "../../redis.ts";
import { saveMessage } from "../../db.ts";
import * as uuid from "jsr:@std/uuid";

export async function processChatInput() {
  const client = await requireRedis();
  const sub = await client.subscribe("chat:input");

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

      if (messageResponse.ok)
        await client.publish(
          "chat:request",
          JSON.stringify({
            userId: parsedMessage.userId,
            messageId: uuid.v1.generate(),
          })
        );
    }
  })();
  return !sub.isClosed;
}

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  const response = await processChatInput();
  console.log("Sentinels listening to chat input...", response);
}
