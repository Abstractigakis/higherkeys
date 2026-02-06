import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { PlaylistPlayer } from "./playlist-player";

export default async function DynamicPlaylistPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/");
  }

  // Get the higherkey metadata
  let key = null;
  let highlights = [];
  let playlistError = null;
  let breadcrumbs: { id: string; name: string }[] = [];

  if (id === "unlabeled") {
    key = { name: "Unlabeled" };
    breadcrumbs = [{ id: "unlabeled", name: "Unlabeled" }];

    const { data: assignedIds } = await supabase
      .from("higherkeys")
      .select("highlight_id")
      .not("highlight_id", "is", null);

    const assignedSet = new Set(assignedIds?.map((a) => a.highlight_id) || []);

    const { data: allH, error: aError } = await supabase
      .from("highlights")
      .select("*, sources(*)");

    if (aError) playlistError = aError;
    const filtered = allH?.filter((h: any) => !assignedSet.has(h.id)) || [];
    highlights = filtered.map((h: any) => ({
      ...h,
      profile_id: h.sources?.profile_id,
    }));
  } else {
    const { data: keyData, error: kError } = await supabase
      .from("higherkeys")
      .select("*")
      .eq("id", id)
      .single();

    if (kError || !keyData) {
      notFound();
    }
    key = keyData;

    // Fetch breadcrumbs using path
    if (keyData.path) {
      const pathParts = (keyData.path as string).split(".");
      const ancestorPaths = pathParts.map((_, i) =>
        pathParts.slice(0, i + 1).join("."),
      );

      const { data: bData } = await supabase
        .from("higherkeys")
        .select("id, name, path")
        .in("path", ancestorPaths);

      // Sort by path length to ensure correct breadcrumb order
      breadcrumbs = (bData || [])
        .sort(
          (a, b) =>
            (a.path as string).split(".").length -
            (b.path as string).split(".").length,
        )
        .map((b) => ({ id: b.id, name: b.name }));
    }

    const { data: rpcHighlights, error: rError } = await supabase.rpc(
      "fetch_playlist_highlights",
      {
        target_key_id: id,
      },
    );
    if (rError) playlistError = rError;
    highlights = rpcHighlights || [];
  }

  // Since RPC might not return assignment IDs yet, we fetch them to be sure
  // or we just trust the highlights and fetch the higherkeys for them
  let assignments: {
    id: string;
    highlight_id: string | null;
    parent_id: string | null;
    order_index: number | null;
  }[] = [];
  if (highlights.length > 0) {
    const highlightIds = highlights.map((h: any) => h.id);
    const { data: assignmentsData, error: aError } = await supabase
      .from("higherkeys")
      .select("id, highlight_id, parent_id, order_index")
      .in("highlight_id", highlightIds);

    if (aError) {
      console.error("Error fetching assignments:", aError);
    } else {
      assignments = assignmentsData || [];
    }
  }

  if (playlistError) {
    console.error(
      "Playlist Error Details:",
      JSON.stringify(playlistError, null, 2),
    );
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-white p-10">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-black uppercase tracking-widest text-red-500">
            Error
          </h1>
          <p className="text-white/60 font-mono text-xs break-all">
            {playlistError.message || "Failed to load playlist"}
          </p>
          <pre className="text-left bg-white/5 p-4 rounded text-[10px] overflow-auto max-h-40">
            {JSON.stringify(playlistError, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  const highlightsWithAssignments = highlights?.map((h: any) => {
    // Find the assignment that belongs to this key tree
    // For now, we'll just take the first one found or filter by the ones we know are in this tree
    const assignment = assignments?.find((a) => a.highlight_id === h.id);
    return {
      ...h,
      assignment_id: assignment?.id,
      higherkey_id: assignment?.parent_id,
      order_index: assignment?.order_index,
    };
  });

  return (
    <div className="w-screen h-screen bg-black">
      <PlaylistPlayer
        keyId={id}
        keyName={key.name}
        breadcrumbs={breadcrumbs}
        highlights={highlightsWithAssignments || []}
        user={user}
        profile={profile}
      />
    </div>
  );
}
