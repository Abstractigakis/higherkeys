import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardContainer } from "@/components/dashboard-container";
import { Suspense } from "react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  if (!user.email_confirmed_at) {
    redirect("/verify-email");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/");
  }

  const { data: allKeys } = await supabase
    .from("higherkeys")
    .select("*")
    .eq("profile_id", user.id);

  const { data: rawSources } = await supabase
    .from("sources")
    .select(
      "*, highlights(*, higherkeys(*, parent:higherkeys(source_id, highlight_id, name)))",
    )
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  // Map parent array to object if necessary
  const sources = (rawSources || []).map((s) => ({
    ...s,
    highlights: (s.highlights || []).map((h) => ({
      ...h,
      higherkeys: (h.higherkeys || []).map((kh) => ({
        ...kh,
        parent: Array.isArray(kh.parent) ? kh.parent[0] : kh.parent,
      })),
    })),
  }));

  return (
    <div className="h-screen w-screen overflow-hidden">
      <Suspense fallback={<div>Loading dashboard...</div>}>
        <DashboardContainer
          initialSources={sources as any}
          initialKeys={(allKeys || []) as any}
          user={user}
          profile={profile}
        />
      </Suspense>
    </div>
  );
}
