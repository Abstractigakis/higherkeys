"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, SupabaseClient } from "@supabase/supabase-js";
import { Tables } from "@/types/supabase";

type HighlightWithHigherKeys = Tables<"highlights"> & {
    alias?: string | null;
    higherkeys: (Tables<"higherkeys"> & {
        path?: string | any;
        parent?: {
            source_id: string | null;
            highlight_id: string | null;
            name: string;
        } | null;
    })[];
};

type SourceWithHighlights = Tables<"sources"> & {
    highlights: HighlightWithHigherKeys[];
    thumbnail_url?: string | null;
    status: string;
};

export function useDashboardData(
    supabase: SupabaseClient,
    user: User,
    initialSources: SourceWithHighlights[],
    initialKeys: Tables<"higherkeys">[],
    sourceSearchQuery: string,
    selectedKeyId: string,
) {
    const [sources, setSources] =
        useState<SourceWithHighlights[]>(initialSources);
    const [allHigherKeys, setAllHigherKeys] =
        useState<Tables<"higherkeys">[]>(initialKeys);

    const activeSearchFilter = useMemo(() => {
        if (sourceSearchQuery)
            return { term: sourceSearchQuery, type: "source" };
        return { term: "", type: "all" as const };
    }, [sourceSearchQuery]);

    const { data: searchResults, isLoading: isSearchLoading } = useQuery({
        queryKey: ["search", activeSearchFilter.term, activeSearchFilter.type],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("search_content", {
                search_term: activeSearchFilter.term,
                primary_filter: activeSearchFilter.type,
            });
            if (error) throw error;
            return data as unknown as {
                sources: Tables<"sources">[];
                highlights: Tables<"highlights">[];
            };
        },
        enabled: !!activeSearchFilter.term,
    });

    const searchResultIds = useMemo(() => {
        if (!searchResults || !activeSearchFilter.term) return null;
        return {
            sources: new Set(searchResults.sources?.map((s) => s.id) || []),
            highlights: new Set(
                searchResults.highlights?.map((h) => h.id) || [],
            ),
        };
    }, [searchResults, activeSearchFilter.term]);

    const refreshSources = useCallback(async () => {
        const { data: updatedSources, error } = await supabase
            .from("sources")
            .select(
                "*, highlights(*, higherkeys(*, parent:higherkeys(source_id, highlight_id, name)))",
            )
            .eq("profile_id", user.id)
            .order("created_at", { ascending: false });

        if (updatedSources) {
            // Flatten parent array if it exists (Supabase sometimes returns many-to-one as an array)
            const mappedSources = updatedSources.map((s: any) => ({
                ...s,
                highlights: (s.highlights || []).map((h: any) => ({
                    ...h,
                    higherkeys: (h.higherkeys || []).map((kh: any) => ({
                        ...kh,
                        parent: Array.isArray(kh.parent)
                            ? kh.parent[0]
                            : kh.parent,
                    })),
                })),
            }));
            setSources(mappedSources as SourceWithHighlights[]);
        }

        const { data: keys } = await supabase
            .from("higherkeys")
            .select("*")
            .eq("profile_id", user.id);

        if (keys) {
            setAllHigherKeys(keys);
        }
    }, [supabase, user.id]);

    useEffect(() => {
        refreshSources();
    }, [refreshSources]);

    useEffect(() => {
        setSources((prev) => {
            const initialIds = new Set(initialSources.map((s) => s.id));
            const localOnly = prev.filter(
                (s) =>
                    !initialIds.has(s.id) &&
                    (s.status === "preparing" || s.status === "pending"),
            );
            return [...localOnly, ...initialSources];
        });
    }, [initialSources]);

    useEffect(() => {
        const channel = supabase
            .channel("dashboard-realtime")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "sources",
                },
                async (payload) => {
                    console.log(
                        "Realtime sources change:",
                        payload.eventType,
                        payload.new,
                    );
                    if (payload.eventType === "INSERT") {
                        const newSource = payload.new as Tables<"sources">;
                        setSources((prev) => {
                            if (prev.some((s) => s.id === newSource.id))
                                return prev;
                            const sourceWithExtra: SourceWithHighlights = {
                                ...newSource,
                                highlights: [],
                            };
                            return [sourceWithExtra, ...prev];
                        });

                        const { data: sourceWithExtra } = await supabase
                            .from("sources")
                            .select("*, highlights(*)")
                            .eq("id", newSource.id)
                            .single();

                        if (sourceWithExtra) {
                            setSources((prev) =>
                                prev.map((s) =>
                                    s.id === newSource.id
                                        ? (sourceWithExtra as SourceWithHighlights)
                                        : s,
                                ),
                            );
                        }
                    } else if (payload.eventType === "UPDATE") {
                        const updatedSource = payload.new as Tables<"sources">;
                        setSources((prev) =>
                            prev.map((s) =>
                                s.id === updatedSource.id
                                    ? { ...s, ...updatedSource }
                                    : s,
                            ),
                        );
                    } else if (payload.eventType === "DELETE") {
                        setSources((prev) =>
                            prev.filter((s) => s.id !== payload.old.id),
                        );
                    }
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "highlights",
                },
                async (payload) => {
                    console.log(
                        "Realtime highlights change:",
                        payload.eventType,
                    );
                    if (
                        payload.eventType === "INSERT" ||
                        payload.eventType === "UPDATE"
                    ) {
                        const highlight = payload.new as Tables<"highlights">;
                        setSources((prev) =>
                            prev.map((s) => {
                                if (s.id !== highlight.source_id) return s;
                                const exists = s.highlights.some(
                                    (h) => h.id === highlight.id,
                                );
                                return {
                                    ...s,
                                    highlights: exists
                                        ? s.highlights.map((h) =>
                                              h.id === highlight.id
                                                  ? ({
                                                          ...h,
                                                          ...highlight,
                                                      } as HighlightWithHigherKeys)
                                                  : h,
                                          )
                                        : [
                                              ...(s.highlights || []),
                                              {
                                                  ...highlight,
                                                  higherkeys: [],
                                              } as HighlightWithHigherKeys,
                                          ].sort((a, b) => {
                                              if (a.start_time !== b.start_time)
                                                  return (
                                                      a.start_time -
                                                      b.start_time
                                                  );
                                              return a.id.localeCompare(b.id);
                                          }),
                                };
                            }),
                        );
                    } else if (payload.eventType === "DELETE") {
                        const oldHighlight =
                            payload.old as Tables<"highlights">;
                        setSources((prev) =>
                            prev.map((s) => ({
                                ...s,
                                highlights: s.highlights.filter(
                                    (h) => h.id !== oldHighlight.id,
                                ),
                            })),
                        );
                    }
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "higherkeys",
                },
                () => {
                    refreshSources();
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, refreshSources]);

    const filteredSources = useMemo(() => {
        const baseSources = searchResultIds
            ? sources.filter((s) => searchResultIds.sources.has(s.id))
            : sources;

        return baseSources
            .map((source) => {
                const matchesSourceSearch =
                    !sourceSearchQuery ||
                    !searchResultIds ||
                    searchResultIds.sources.has(source.id);

                if (!matchesSourceSearch) return null;

                const matchingHighlights = source.highlights.filter((h) => {
                    if (h.is_strikethrough) return false;
                    const matchesSearch =
                        !searchResultIds ||
                        searchResultIds.highlights.has(h.id);
                    // Filter logic for direct links to be implemented if needed
                    return matchesSearch;
                });

                const sourceMatchesSearch =
                    !searchResultIds || searchResultIds.sources.has(source.id);

                if (matchingHighlights.length > 0 || sourceMatchesSearch) {
                    return { ...source, highlights: matchingHighlights };
                }
                return null;
            })
            .filter((s): s is SourceWithHighlights => s !== null);
    }, [sources, sourceSearchQuery, searchResultIds]);

    return {
        sources,
        filteredSources,
        allHigherKeys,
        isSearchLoading,
        refreshSources,
    };
}
