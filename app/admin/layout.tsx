import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <nav className="border-b px-6 py-2 flex gap-4 text-sm">
        <Link href="/admin/episode/1" className="hover:underline">
          Episodes
        </Link>
        <Link href="/admin/process" className="hover:underline">
          Process Wiki
        </Link>
        <Link href="/admin/participants" className="hover:underline">
          Participants
        </Link>
        <Link href="/admin/leaderboard" className="hover:underline">
          Leaderboard
        </Link>
      </nav>
      {children}
    </div>
  );
}
