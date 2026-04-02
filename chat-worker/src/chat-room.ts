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
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client } as ResponseInit);
  }

  webSocketMessage(ws: WebSocket, message: string) {
    const data = JSON.parse(message);
    const broadcast = JSON.stringify({ type: "message", text: data.text, ts: Date.now()})
    for (const conn of this.ctx.getWebSockets()) {
      conn.send(broadcast);
    }
  }
}
