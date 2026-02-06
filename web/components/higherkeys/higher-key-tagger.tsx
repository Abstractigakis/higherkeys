"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { HigherKey } from "@/types/higher-keys";
import { Tables } from "@/types/supabase";
import { toast } from "sonner";
import { useLocation } from "@/components/location-guard";
import { HigherKeyEditor } from "./higher-key-editor";
import { User } from "@supabase/supabase-js";

interface HigherKeyTaggerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightIds?: string[];
  onSuccess?: () => void;
}

export function HigherKeyTagger({
  open,
  onOpenChange,
  highlightIds,
  onSuccess,
}: HigherKeyTaggerProps) {
  const supabase = createClient();
  const { location } = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
    });
  }, [supabase]);

  const fetchAssigned = useCallback(async () => {
    if (!open) return;

    // If tagging multiple highlights, we fetch tags for all of them
    // and show a tag as "assigned" if ANY of the highlights have it.
    const idsToFetch = highlightIds || [];
    if (idsToFetch.length === 0) return;

    const { data, error } = await supabase
      .from("higherkeys")
      .select("parent_id")
      .in("highlight_id", idsToFetch);

    if (error) {
      toast.error(error.message);
    } else {
      // Unique set of parent_ids across all selected entities
      const uniqueIds = Array.from(
        new Set(data.map((a: any) => a.parent_id).filter(Boolean)),
      );
      setAssignedIds(uniqueIds as string[]);
    }
  }, [open, highlightIds, supabase]);

  useEffect(() => {
    fetchAssigned();
  }, [fetchAssigned]);

  const toggleTag = async (key: HigherKey) => {
    const isAssigned = assignedIds.includes(key.id);
    const idsToTag = highlightIds || [];

    if (idsToTag.length === 0) return;

    try {
      if (isAssigned) {
        // Find root key for persistence rule
        const { data: rootData } = await supabase
          .from("higherkeys")
          .select("id")
          .is("parent_id", null)
          .eq("name", profile?.username ?? "")
          .single();

        const rootKeyId = rootData?.id;

        // Check each highlight's instance count
        for (const hid of idsToTag) {
          const { data: instances } = await supabase
            .from("higherkeys")
            .select("id, parent_id")
            .eq("highlight_id", hid);

          if (
            instances &&
            instances.length === 1 &&
            instances[0].parent_id === key.id
          ) {
            // It's the only folder. Move to root if not already there.
            if (rootKeyId && key.id !== rootKeyId) {
              await supabase
                .from("higherkeys")
                .update({ parent_id: rootKeyId })
                .eq("id", instances[0].id);
            }
          } else {
            // Safe to remove this specific tag
            await supabase
              .from("higherkeys")
              .delete()
              .eq("highlight_id", hid)
              .eq("parent_id", key.id);
          }
        }

        setAssignedIds((prev) => prev.filter((id) => id !== key.id));
        toast.success(`Updated tags for all selected`);
      } else {
        // Add to ALL
        // Fetch source_ids for these highlights
        const { data: highlights, error: fetchError } = await supabase
          .from("highlights")
          .select("id, source_id, alias")
          .in("id", idsToTag);

        if (fetchError) throw fetchError;

        const inserts = highlights.map((hl) => ({
          highlight_id: hl.id,
          parent_id: key.id,
          profile_id: user!.id,
          source_id: hl.source_id,
          name: hl.alias || "Highlight",
          latitude: location?.lat,
          longitude: location?.lng,
        }));

        const { error } = await supabase.from("higherkeys").insert(inserts);

        if (error) throw error;
        setAssignedIds((prev) => [...prev, key.id]);
        toast.success(
          `Added tag: ${key.name} to ${idsToTag.length} highlight${
            idsToTag.length > 1 ? "s" : ""
          }`,
        );
      }
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!user || !profile) return null;

  return (
    <HigherKeyEditor
      mode="modal"
      open={open}
      onOpenChange={onOpenChange}
      onSelect={toggleTag}
      assignedIds={assignedIds}
      taggingIds={highlightIds}
      onTaggingComplete={() => onOpenChange(false)}
      user={user}
      profile={profile}
    />
  );
}
