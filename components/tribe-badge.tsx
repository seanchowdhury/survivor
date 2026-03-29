export function TribeBadge({ tribe, size = "sm", suffix }: { tribe: string; size?: "sm" | "md"; suffix?: string }) {
  const styles: Record<string, string> = {
    cila: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    kalo: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
    vatu: "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30",
  };
  const cls = styles[tribe.toLowerCase()] ?? "bg-gray-600/40 text-gray-300 border border-gray-500/30";
  const textSize = size === "md" ? "text-sm" : "text-xs";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full font-semibold capitalize ${textSize} ${cls}`}>
      {tribe}{suffix ? ` · ${suffix}` : ""}
    </span>
  );
}
