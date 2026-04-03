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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth/client";
import { getChatToken, getNextEpisodeNumber } from "./actions";
import { use, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastTypingSent = useRef(0);
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [connecting, setConnecting] = useState<boolean>(true);
  const [nextEpisode, setNextEpisode] = useState<number | null>(null);

  const { data: session } = authClient.useSession();
  const username = session?.user.name;

  useEffect(() => {
    getNextEpisodeNumber().then(setNextEpisode);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setOpen(isChatOpen()), 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;

    let wsCurrent: WebSocket | null = null;

    getChatToken().then((token) => {
      if (!token) return;

      const socket = new WebSocket(
        `${process.env.NEXT_PUBLIC_CHAT_WS_URL}/league/${leagueId}?token=${encodeURIComponent(token)}`,
      );

      socket.onopen = () => setConnecting(false);

      socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "presence") {
          setOnlineUsers(data.users);
        } else if (data.type === "typing") {
          const name = data.username as string;
          setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));
          // Clear existing timer for this user
          const existing = typingTimers.current.get(name);
          if (existing) clearTimeout(existing);
          // Remove after 3s of no typing
          typingTimers.current.set(
            name,
            setTimeout(() => {
              setTypingUsers((prev) => prev.filter((u) => u !== name));
              typingTimers.current.delete(name);
            }, 3000),
          );
        } else {
          setMessages((prev) => [...prev, data as Message]);
        }
      });
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

  function handleTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current > 2000) {
      ws.current?.send(JSON.stringify({ type: "typing" }));
      lastTypingSent.current = now;
    }
  }

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
    <div className="flex justify-center md:p-4">
      <Card className="flex flex-col h-[calc(100dvh-3.5rem)] w-full max-w-2xl rounded-none md:rounded-lg">
        <CardHeader className="px-3 py-2 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <CardTitle>League Chat{nextEpisode ? ` — Episode ${nextEpisode}` : ""}</CardTitle>
            {onlineUsers.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-xs text-muted-foreground">
                        {onlineUsers.length} online
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex flex-col gap-1">
                      {onlineUsers.map((name) => (
                        <span key={name} className="text-xs">{name}</span>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="flex h-full flex-col-reverse gap-3 overflow-y-auto pr-4">
            {[...messages].reverse().map((message, idx) => {
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
                      isMe ? "bg-primary text-primary-foreground" : "bg-muted",
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
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-1 px-3 py-2 md:px-6 md:py-4">
          {typingUsers.length > 0 && (
            <p className="text-xs text-muted-foreground italic">
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.join(", ")} are typing...`}
            </p>
          )}
          <form onSubmit={handleSubmit} className="flex w-full gap-2">
            <Input
              placeholder="Say something..."
              name="message"
              autoComplete="off"
              enterKeyHint="send"
              onInput={handleTyping}
            />
            <Button type="submit" disabled={connecting}>
              {connecting ? <Spinner data-icon="inline-start" /> : "Send"}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
