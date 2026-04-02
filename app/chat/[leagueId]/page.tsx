"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth/client";
import { getChatToken } from "./actions";
import { use, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function isChatOpen(): boolean {
  const now = new Date();
  const eastern = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const day = eastern.getDay(); // 3 = Wednesday
  const timeInMinutes = eastern.getHours() * 60 + eastern.getMinutes();
  return day === 3 && timeInMinutes >= 19 * 60 + 30 && timeInMinutes < 23 * 60;
}

type Message = {
  username: string;
  text: string;
  ts: Date;
  type: string;
};

export default function LeagueChat({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = use(params);
  const ws = useRef<WebSocket>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [open, setOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: session } = authClient.useSession();
  const username = session?.user.name;

  // useEffect(() => {
  //   const id = setInterval(() => setOpen(isChatOpen()), 10000);
  //   return () => clearInterval(id);
  // }, []);

  useEffect(() => {
    if (!open) return;

    let wsCurrent: WebSocket | null = null;

    getChatToken().then((token) => {
      if (!token) return;
      console.log(process.env.NEXT_PUBLIC_CHAT_WS_URL);
      const socket = new WebSocket(
        `${process.env.NEXT_PUBLIC_CHAT_WS_URL}/league/${leagueId}?token=${encodeURIComponent(token)}`,
      );
      socket.onopen = () => console.log("ws opened");
      socket.onclose = () => console.log("ws closed");
      socket.addEventListener("message", (event) =>
        setMessages((prev) => {
          const message: Message = JSON.parse(event.data);
          return [...prev, message];
        }),
      );
      ws.current = socket;
      wsCurrent = socket;
    });

    return () => {
      wsCurrent?.close();
    };
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const message = formData.get("message") as string;
    if (!message.trim()) return;
    ws.current?.send(JSON.stringify({ text: message }));
    event.currentTarget.reset();
  }

  if (!open) {
    return (
      <div className="flex justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle>Chat is closed</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Chat opens Wednesday at 7:30 PM EST
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center p-4">
      <Card className="flex flex-col h-150 w-full max-w-2xl">
        <CardHeader>
          <CardTitle>League Chat</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="flex flex-col gap-3">
              {messages.map((message, idx) => {
                const isMe = message.username === username;
                return (
                  <div
                    key={idx}
                    className={cn("flex gap-2", isMe && "flex-row-reverse")}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs">
                        {message.username?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 max-w-[70%] text-sm",
                        isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                      )}
                    >
                      {!isMe && (
                        <p className="font-medium text-xs mb-1 opacity-70">
                          {message.username}
                        </p>
                      )}
                      {message.text}
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <form onSubmit={handleSubmit} className="flex w-full gap-2">
            <Input
              placeholder="Say something..."
              name="message"
              autoComplete="off"
            />
            <Button type="submit">Send</Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
