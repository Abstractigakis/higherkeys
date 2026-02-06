import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NextLink from "next/link";
import { HighlighterContainer } from "@/components/highlighter/highlighter-container";

export default async function SourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    t?: string;
    backTab?: string;
    sourceId?: string;
    highlightId?: string;
    submissionId?: string;
  }>;
}) {
  const { id } = await params;
  const { t, backTab, sourceId, highlightId, submissionId } = await searchParams;
  const initialTime = t ? parseFloat(t) : 0;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/");
  }

  // Fetch source
  const { data: source } = await supabase
    .from("sources")
    .select("id, profile_id")
    .eq("id", id)
    .maybeSingle();

  if (!source) {
    return <div>Source not found</div>;
  }

  // Fetch highlights
  const { data: rawHighlights } = await supabase
    .from("highlights")
    .select(
      "*, higherkeys(*, parent:higherkeys(source_id, highlight_id, name))",
    )
    .eq("source_id", id);

  const highlights = (rawHighlights || []).map((h) => ({
    ...h,
    higherkeys: (h.higherkeys || []).map((hk) => ({
      ...hk,
      parent: Array.isArray(hk.parent) ? hk.parent[0] : hk.parent,
    })),
  }));

  const vttUrl = supabase.storage
    .from("sources")
    .getPublicUrl(`${source.profile_id}/${source.id}/words.vtt`).data.publicUrl;
  const hlsUrl = supabase.storage
    .from("sources")
    .getPublicUrl(`${source.profile_id}/${source.id}/hls/playlist.m3u8`)
    .data.publicUrl;

  const backUrl = backTab
    ? `/dashboard?tab=${backTab}${sourceId ? `&sourceId=${sourceId}` : ""}${
        highlightId ? `&highlightId=${highlightId}` : ""
      }`
    : "/dashboard";

  return (
    <div className="w-screen h-screen overflow-hidden bg-black text-white">
      {/* Back Button Overlay */}
      <NextLink
        href={backUrl}
        className="fixed top-4 left-4 z-50 text-white/50 hover:text-white bg-black/50 px-3 py-1 rounded transition-colors"
      >
        ← Back
      </NextLink>

      <HighlighterContainer
        source={source}
        initialHighlights={highlights || []}
        vttUrl={vttUrl}
        hlsUrl={hlsUrl}
        user={user}
        profile={profile}
        initialTime={initialTime}
        backTab={backTab}
        sourceId={sourceId}
        highlightId={highlightId}
        submissionId={submissionId}
      />
    </div>
  );
}
