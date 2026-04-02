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

    this.ctx.acceptWebSocket(server, [username]);

    // Broadcast updated presence after new connection
    this.broadcastPresence();

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as ResponseInit);
  }

  webSocketMessage(ws: WebSocket, message: string) {
    const data = JSON.parse(message);
    const tags = this.ctx.getTags(ws);
    const username = tags[0] ?? "Anonymous";

    if (data.type === "typing") {
      const msg = JSON.stringify({ type: "typing", username });
      for (const conn of this.ctx.getWebSockets()) {
        if (conn !== ws) conn.send(msg);
      }
      return;
    }

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

  webSocketClose() {
    this.broadcastPresence();
  }

  webSocketError() {
    this.broadcastPresence();
  }

  private broadcastPresence() {
    const sockets = this.ctx.getWebSockets();
    const users = [...new Set(sockets.map((s) => this.ctx.getTags(s)[0]))];
    const msg = JSON.stringify({ type: "presence", users });

    for (const conn of sockets) {
      conn.send(msg);
    }
  }
}
