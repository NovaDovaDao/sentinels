export type Sender = "user" | "agent";
export type Message = {
  sender: Sender;
  content: string;
  messageId: string;
  timestamp: number;
};

export type Chat = {
  messages: Message[];
};
