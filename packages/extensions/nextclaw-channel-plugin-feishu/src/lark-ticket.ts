import { AsyncLocalStorage } from "node:async_hooks";

export type LarkTicket = {
  messageId: string;
  chatId: string;
  accountId: string;
  startTime: number;
  senderOpenId?: string;
  chatType?: "p2p" | "group" | "private";
  threadId?: string;
};

const store = new AsyncLocalStorage<LarkTicket>();

export function withTicket<T>(ticket: LarkTicket, fn: () => T | Promise<T>): T | Promise<T> {
  return store.run(ticket, fn);
}

export function getTicket(): LarkTicket | undefined {
  return store.getStore();
}

export function ticketElapsed(): number {
  const ticket = getTicket();
  return ticket ? Date.now() - ticket.startTime : 0;
}
