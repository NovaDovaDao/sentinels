import "jsr:@std/dotenv/load";
import { requireRedis } from "../../redis.ts";
import { getChatByUserId, saveMessage } from "../../db.ts";

export async function processChatRequest() {
  const client = await requireRedis();
  const sub = await client.subscribe("chat:input");

  (async function () {
    for await (const { message } of sub.receive()) {
      const parsedMessage = JSON.parse(message);
      const history = await getChatByUserId(parsedMessage.userId);
      /**
       *
       * ask agent here
       */
      // const agentResponse = await queryAgentWithHistory(history)
      const saveMessageResponse = await saveMessage({
        userId: parsedMessage.userId,
        messageId: parsedMessage.messageId,
        content: `Sounds good. I read the previous ${history.value?.messages.length} messages 😬...`,
        sender: "agent",
      });

      if (saveMessageResponse.ok)
        await client.publish(
          "chat:response",
          JSON.stringify({
            userId: parsedMessage.userId,
            messageId: saveMessageResponse.messageId,
          })
        );
    }
  })();
  return !sub.isClosed;
}

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  const response = await processChatRequest();
  console.log("Sentinels listening for chat requests...", response);
}
