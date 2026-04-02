import { DurableObjectNamespace } from "@cloudflare/workers-types";

type Env = {
  CHAT_ROOM: DurableObjectNamespace;
  CHAT_SECRET: string;
};

const worker = {
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);
    const episodeId = url.pathname.split("/")[2];

    const id = env.CHAT_ROOM.idFromName(episodeId);
    const room = env.CHAT_ROOM.get(id);

    console.log({ id, room });

    return room.fetch(req);
  },
};

export default worker;

export { ChatRoom } from "./chat-room";
