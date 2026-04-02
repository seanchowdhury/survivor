import type { DurableObjectState } from "@cloudflare/workers-types";

export class ChatRoom {
  ctx: DurableObjectState;
  initialized = false;

  constructor(ctx: DurableObjectState) {
    this.ctx = ctx;
  }

  private ensureTable() {
    if (this.initialized) return;
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        text TEXT NOT NULL,
        ts INTEGER NOT NULL
      )
    `);
    this.initialized = true;
  }

  private clearOldMessages() {
    // Clear messages older than 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.ctx.storage.sql.exec(`DELETE FROM messages WHERE ts < ?`, cutoff);
  }

  async fetch(req: Request) {
    if (req.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    this.ensureTable();
    this.clearOldMessages();

    const username = req.headers.get("X-Chat-Username") ?? "Anonymous";
    const { 0: client, 1: server } = new WebSocketPair();

    this.ctx.acceptWebSocket(server, [username]);

    // Send chat history to the new connection
    const rows = this.ctx.storage.sql
      .exec(`SELECT username, text, ts FROM messages ORDER BY id ASC`)
      .toArray();

    for (const row of rows) {
      server.send(
        JSON.stringify({
          type: "message",
          username: row.username,
          text: row.text,
          ts: row.ts,
        }),
      );
    }

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

    const ts = Date.now();

    this.ensureTable();
    this.ctx.storage.sql.exec(
      `INSERT INTO messages (username, text, ts) VALUES (?, ?, ?)`,
      username,
      data.text,
      ts,
    );

    const broadcast = JSON.stringify({
      type: "message",
      text: data.text,
      username,
      ts,
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
