import {
  getParticipants,
  getAllCastMembers,
  getAllEpisodes,
  getEpisodeRoster,
  createParticipant,
  deleteParticipant,
} from "./actions";
import ParticipantRosterEditor from "./participant-roster-editor";

export default async function ParticipantsPage() {
  const [participants, castMembers, episodes] = await Promise.all([
    getParticipants(),
    getAllCastMembers(),
    getAllEpisodes(),
  ]);

  const firstEpisode = episodes[0];

  // Load initial rosters for all participants (episode 1 = draft)
  const rosters = firstEpisode
    ? await Promise.all(
        participants.map((p) => getEpisodeRoster(p.id, firstEpisode.id)),
      )
    : participants.map(() => []);

  async function handleCreate(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    if (name?.trim()) await createParticipant(name.trim());
  }

  async function handleDelete(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    if (id) await deleteParticipant(id);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Participants & Draft Picks</h1>

      {/* Add participant */}
      <form action={handleCreate} className="flex gap-2">
        <input
          name="name"
          placeholder="Participant name"
          required
          className="border rounded px-3 py-1 text-sm flex-1 max-w-xs"
        />
        <button
          type="submit"
          className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:opacity-90"
        >
          Add participant
        </button>
      </form>

      {participants.length === 0 && (
        <p className="text-muted-foreground text-sm">No participants yet.</p>
      )}

      {/* Participant list */}
      <div className="space-y-6">
        {participants.map((p, i) => (
          <div key={p.id} className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-medium">{p.name}</span>
              <form action={handleDelete}>
                <input type="hidden" name="id" value={p.id} />
                <button
                  type="submit"
                  className="text-xs text-destructive hover:underline"
                >
                  Delete
                </button>
              </form>
            </div>

            {firstEpisode && (
              <ParticipantRosterEditor
                participantId={p.id}
                participantName={p.name}
                episodes={episodes.map((e) => ({
                  id: e.id,
                  episodeNumber: e.episodeNumber,
                  title: e.title,
                }))}
                castMembers={castMembers.map((c) => ({
                  id: c.id,
                  name: c.name,
                }))}
                initialEpisodeId={firstEpisode.id}
                initialRoster={rosters[i]}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
