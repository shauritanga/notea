export const instant = false;

import Link from "next/link";
import { Card, Quiet, Shell, Stack, Title, Trust } from "@/components/ui";
import { searchPlayers } from "@/domain/talent";
import { requireViewer } from "@/lib/viewer";

export default async function PlayersPage({ searchParams }: PageProps<"/">) {
  const { db, user, lang } = await requireViewer();
  const params = await searchParams;
  const players = await searchPlayers(db, user.id, {
    query: typeof params.q === "string" ? params.q : undefined,
    position: typeof params.position === "string" ? params.position : undefined,
    preferredFoot: typeof params.foot === "string" ? params.foot : undefined,
    region: typeof params.region === "string" ? params.region : undefined,
    level: typeof params.level === "string" ? params.level : undefined,
    section: typeof params.section === "string" ? params.section : undefined,
    verifiedOnly: params.verified === "1",
  });
  return (
    <Shell lang={lang}>
      <Title>Wachezaji</Title>
      <form className="grid gap-3">
        <input className="h-12 rounded-2xl border border-line px-4" name="q" placeholder="Name" defaultValue={typeof params.q === "string" ? params.q : ""} />
        <div className="grid grid-cols-2 gap-3">
          <input className="h-12 rounded-2xl border border-line px-4" name="position" placeholder="Position" />
          <input className="h-12 rounded-2xl border border-line px-4" name="foot" placeholder="Foot" />
          <input className="h-12 rounded-2xl border border-line px-4" name="region" placeholder="Region" />
          <input className="h-12 rounded-2xl border border-line px-4" name="level" placeholder="Level" />
          <input className="h-12 rounded-2xl border border-line px-4" name="section" placeholder="women or open" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="verified" value="1" /> Verified only
          </label>
        </div>
        <button className="h-12 rounded-full bg-pitch text-white" type="submit">Tafuta</button>
      </form>
      <Stack>
        {players.length === 0 ? <Quiet>No players match.</Quiet> : null}
        {players.map((player) => (
          <Card key={player.id}>
            <Link className="text-lg font-semibold" href={`/players/${player.id}`}>{player.displayName}</Link>
            <Trust verified={player.verified} lang={lang} />
            <Quiet>{[player.position, player.preferredFoot, player.region, player.level, player.section].filter(Boolean).join(" · ")}</Quiet>
            <Quiet>{player.selfReported ? "Self-reported" : "Verified information"}</Quiet>
          </Card>
        ))}
      </Stack>
    </Shell>
  );
}
