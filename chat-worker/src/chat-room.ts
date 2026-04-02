import type { DurableObjectState } from "@cloudflare/workers-types";

export class ChatRoom {
  ctx: DurableObjectState;

  constructor(ctx: DurableObjectState) {
    this.ctx = ctx;
  }

  async fetch(req: Request) {
    if (req.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const username = req.headers.get("X-Chat-Username") ?? "Anonymous";
    const { 0: client, 1: server } = new WebSocketPair();

    // Tag the socket with the verified username
    this.ctx.acceptWebSocket(server, [username]);

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as ResponseInit);
  }

  webSocketMessage(ws: WebSocket, message: string) {
    const data = JSON.parse(message);
    const tags = this.ctx.getTags(ws);
    const username = tags[0] ?? "Anonymous";

    const broadcast = JSON.stringify({
      type: "message",
      text: data.text,
      username,
      ts: Date.now(),
    });

    for (const conn of this.ctx.getWebSockets()) {
      conn.send(broadcast);
    }
  }
}
