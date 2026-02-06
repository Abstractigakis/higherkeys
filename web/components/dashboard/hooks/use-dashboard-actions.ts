"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SupabaseClient } from "@supabase/supabase-js";
import { Tables } from "@/types/supabase";

type HighlightWithHigherKeys = Tables<"highlights"> & {
    alias?: string | null;
    higherkeys: Tables<"higherkeys">[];
};

type SourceWithHighlights = Tables<"sources"> & {
    highlights: HighlightWithHigherKeys[];
    thumbnail_url?: string | null;
    status: string;
};

export function useDashboardActions(
    supabase: SupabaseClient,
    sources: SourceWithHighlights[],
    allHigherKeys: Tables<"higherkeys">[],
    selectedKeyId: string,
) {
    const router = useRouter();
    const [isDeletingSource, setIsDeletingSource] = useState(false);
    const [isDeletingHighlight, setIsDeletingHighlight] = useState(false);

    const handleDeleteSource = useCallback(
        async (id: string) => {
            if (isDeletingSource) return;
            setIsDeletingSource(true);

            const { error } = await supabase
                .from("sources")
                .delete()
                .eq("id", id);

            if (error) {
                toast.error(error.message);
            } else {
                toast.success("Source deleted");
                router.refresh();
            }
            setIsDeletingSource(false);
        },
        [isDeletingSource, supabase, router],
    );

    const handleDeleteHighlight = useCallback(
        async (id: string) => {
            if (isDeletingHighlight) return;
            setIsDeletingHighlight(true);

            if (selectedKeyId !== "all") {
                const highlight = sources
                    .flatMap((s) => s.highlights)
                    .find((h) => h.id === id);
                const targetKey = allHigherKeys.find(
                    (k) => k.id === selectedKeyId,
                );

                if (highlight && targetKey) {
                    const association = highlight.higherkeys.find(
                        (kh) =>
                            kh.parent_id === selectedKeyId ||
                            kh.id === selectedKeyId,
                    );

                    if (association) {
                        const { error } = await supabase
                            .from("higherkeys")
                            .delete()
                            .eq("id", association.id);

                        if (error) {
                            toast.error(error.message);
                        } else {
                            toast.success(`Removed from ${association.name}`);
                            router.refresh();
                        }
                        setIsDeletingHighlight(false);
                        return;
                    }
                }
            }

            const { error } = await supabase
                .from("highlights")
                .delete()
                .eq("id", id);

            if (error) {
                toast.error(error.message);
            } else {
                toast.success("Highlight deleted");
                router.refresh();
            }
            setIsDeletingHighlight(false);
        },
        [
            isDeletingHighlight,
            supabase,
            router,
            selectedKeyId,
            allHigherKeys,
            sources,
        ],
    );

    return {
        handleDeleteSource,
        handleDeleteHighlight,
        isDeletingSource,
        isDeletingHighlight,
    };
}
