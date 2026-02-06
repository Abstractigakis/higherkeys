"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type DashboardShortcutsProps = {
    filteredSources?: SourceWithHighlights[];
    allHigherKeys?: Tables<"higherkeys">[];
    safeSourceIndex?: number;
    activeHighlightIndex?: number;
    setActiveSourceIndex?: (index: number | ((prev: number) => number)) => void;
    setActiveHighlightIndex?: (
        index: number | ((prev: number) => number),
    ) => void;
    setIsLegendOpen?: (open: boolean | ((prev: boolean) => boolean)) => void;
    setIsKeyFilterModalOpen?: (open: boolean) => void;
    setIsSourceSearchModalOpen?: (open: boolean) => void;
    setTaggingHighlightIds?: (ids: string[]) => void;
    setAliasingHighlightIds?: (ids: string[]) => void;
    setIsKeyManagerModalOpen?: (open: boolean) => void;
    setIsHigherKeysModalOpen?: (open: boolean) => void;
    setIsDownloadModalOpen?: (open: boolean) => void;
    sourceToDelete?: SourceWithHighlights | null;
    setSourceToDelete?: (source: SourceWithHighlights | null) => void;
    highlightToDelete?: Tables<"highlights"> | null;
    setHighlightToDelete?: (highlight: Tables<"highlights"> | null) => void;
    deleteConfirmationFocus?: "cancel" | "delete";
    setDeleteConfirmationFocus?: (focus: "cancel" | "delete") => void;
    handleDeleteSource?: (id: string) => Promise<void>;
    handleDeleteHighlight?: (id: string) => Promise<void>;
    clearAllFilters?: () => void;
    isModalsOpen?: boolean;
    isFocused: boolean;
    onTab: () => void;
};

export function useDashboardShortcuts({
    filteredSources = [],
    allHigherKeys = [],
    safeSourceIndex = 0,
    activeHighlightIndex = -1,
    setActiveSourceIndex,
    setActiveHighlightIndex,
    setIsLegendOpen,
    setIsKeyFilterModalOpen,
    setIsSourceSearchModalOpen,
    setTaggingHighlightIds,
    setAliasingHighlightIds,
    setIsKeyManagerModalOpen,
    setIsHigherKeysModalOpen,
    setIsDownloadModalOpen,
    sourceToDelete,
    setSourceToDelete,
    highlightToDelete,
    setHighlightToDelete,
    deleteConfirmationFocus,
    setDeleteConfirmationFocus,
    handleDeleteSource,
    handleDeleteHighlight,
    clearAllFilters,
    isModalsOpen = false,
    isFocused,
    onTab,
}: DashboardShortcutsProps) {
    const router = useRouter();
    const [columns, setColumns] = useState(1);

    // Responsive Column Detection
    useEffect(() => {
        const handleResize = () => {
             const width = window.innerWidth;
             if (width >= 1536) setColumns(4); // 2xl
             else if (width >= 1280) setColumns(3); // xl
             else if (width >= 768) setColumns(2); // md
             else setColumns(1);
        };
        
        handleResize(); // Init
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (
                (e.target instanceof HTMLInputElement ||
                    e.target instanceof HTMLTextAreaElement) &&
                e.key !== "Escape"
            ) {
                return;
            }

            // Global shortcuts (Work regardless of focus)
            if (e.key === "Tab") {
                e.preventDefault();
                onTab?.();
                return;
            }

            if (isModalsOpen) {
                if (e.key === "Escape") {
                    setTaggingHighlightIds?.([]);
                    setAliasingHighlightIds?.([]);
                    setIsHigherKeysModalOpen?.(false);
                    setIsKeyFilterModalOpen?.(false);
                    setIsSourceSearchModalOpen?.(false);
                    setIsKeyManagerModalOpen?.(false);
                    setSourceToDelete?.(null);
                    setHighlightToDelete?.(null);
                }

                if (sourceToDelete || highlightToDelete) {
                    switch (e.key.toLowerCase()) {
                        case "arrowleft":
                            e.preventDefault();
                            setDeleteConfirmationFocus?.("cancel");
                            break;
                        case "arrowright":
                            e.preventDefault();
                            setDeleteConfirmationFocus?.("delete");
                            break;
                        case "enter":
                            e.preventDefault();
                            if (deleteConfirmationFocus === "delete") {
                                if (sourceToDelete) {
                                    handleDeleteSource?.(sourceToDelete.id);
                                    setSourceToDelete?.(null);
                                } else if (highlightToDelete) {
                                    handleDeleteHighlight?.(
                                        highlightToDelete.id,
                                    );
                                    setHighlightToDelete?.(null);
                                }
                            } else {
                                setSourceToDelete?.(null);
                                setHighlightToDelete?.(null);
                            }
                            break;
                    }
                }
                return;
            }

            if (e.key.toLowerCase() === "p") {
                e.preventDefault();
                const currentSource = filteredSources[safeSourceIndex];
                if (currentSource) {
                    // Logic to find source key ... same as before
                     let sourceKey = allHigherKeys.find(
                        (k) =>
                            k.source_id === currentSource.id && !k.highlight_id,
                    );
                    if (!sourceKey) {
                        for (const h of currentSource.highlights || []) {
                            for (const kh of h.higherkeys || []) {
                                // @ts-ignore
                                const parent = kh.parent;
                                if (parent && parent.source_id === currentSource.id && !parent.highlight_id) {
                                    // @ts-ignore
                                    router.push(`/playlist/${parent.id || kh.parent_id}`);
                                    return;
                                }
                            }
                        }
                    }
                return;
            }



            setIsHigherKeysModalOpen?.(true);
                return;
            }

            if (e.key.toLowerCase() === "d") {
                e.preventDefault();
                setIsDownloadModalOpen?.(true);
                return;
            }

            if (e.key.toLowerCase() === "l") {
                e.preventDefault();
                setIsLegendOpen?.((prev) => !prev);
                return;
            }

            if (!isFocused) return;

            const sourceCount = filteredSources.length;
            if (sourceCount === 0) return;

            if (e.key === "Escape") {
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                    (e.target as HTMLElement).blur();
                }
                return;
            }

            if (e.metaKey || e.ctrlKey) {
                if (e.key.toLowerCase() === "s") {
                    e.preventDefault();
                    setIsSourceSearchModalOpen?.(true);
                    return;
                }
                if (e.key.toLowerCase() === "k") {
                    e.preventDefault();
                    setIsKeyFilterModalOpen?.(true);
                    return;
                }
            }

            if (e.key.toLowerCase() === "h") {
                e.preventDefault();
                setIsKeyManagerModalOpen?.(true);
                return;
            }



            if (e.key.toLowerCase() === "x") {
                e.preventDefault();
                clearAllFilters?.();
                return;
            }

            const currentSource = filteredSources[safeSourceIndex];
            if (!currentSource) return;

            switch (e.key.toLowerCase()) {
                case "arrowleft":
                    e.preventDefault();
                     // Sequential prev
                    setActiveSourceIndex?.((prev) => Math.max(0, prev - 1));
                    break;
                case "arrowright":
                    e.preventDefault();
                    // Sequential next
                    setActiveSourceIndex?.((prev) =>
                        Math.min(sourceCount - 1, prev + 1),
                    );
                    break;
                case "arrowup":
                    e.preventDefault();
                    // JUMP UP by column count
                    setActiveSourceIndex?.((prev) => Math.max(0, prev - columns));
                    break;
                case "arrowdown":
                    e.preventDefault();
                    // JUMP DOWN by column count
                    setActiveSourceIndex?.((prev) =>
                        Math.min(sourceCount - 1, prev + columns),
                    );
                    break;
                case "delete":
                case "backspace":
                    e.preventDefault();
                    setSourceToDelete?.(currentSource);
                    setDeleteConfirmationFocus?.("cancel");
                    break;
                case "k":
                    // Tagging source directly? Maybe in future. For now do nothing or open general tagger
                     e.preventDefault();
                     setIsKeyManagerModalOpen?.(true);
                    break;
                case "enter":
                    e.preventDefault();
                    router.push(
                        `/source/${currentSource.id}?backTab=sources&sourceId=${currentSource.id}`,
                    );
                    break;
            }
        },
        [
            columns, // Added dependency
            isModalsOpen,
            filteredSources,
            allHigherKeys,
            safeSourceIndex,
            activeHighlightIndex,
            router,
            sourceToDelete,
            highlightToDelete,
            deleteConfirmationFocus,
            handleDeleteSource,
            handleDeleteHighlight,
            clearAllFilters,
            setActiveSourceIndex,
            setActiveHighlightIndex,
            setIsLegendOpen,
            setIsKeyFilterModalOpen,
            setIsSourceSearchModalOpen,
            setTaggingHighlightIds,
            setAliasingHighlightIds,
            setIsKeyManagerModalOpen,
            setIsHigherKeysModalOpen,
            setIsDownloadModalOpen,
            setSourceToDelete,
            setHighlightToDelete,
            setDeleteConfirmationFocus,
            isFocused,
            onTab,
        ],
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);
}
