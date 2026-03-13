"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectEpisode } from "@/db/schema";

export default function EpisodeSelector({
  episodes,
  currentEpisodeId,
}: {
  episodes: SelectEpisode[];
  currentEpisodeId: number;
}) {
  const router = useRouter();
  return (
    <Select
      value={`${currentEpisodeId}`}
      onValueChange={(val) => router.push(`/admin/episode/${val}`)}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {episodes.map((ep) => (
            <SelectItem key={ep.id} value={`${ep.id}`}>
              Episode {ep.episodeNumber}: {ep.title}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
